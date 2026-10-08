"""Weight-only quantisation the extension's ONNX Runtime (WASM build) can run:
- MatMul weights: 4-bit block-wise (MatMulNBits, block 32, symmetric)
- big embedding tables (Gather on an initializer with >= 1M elements): int8 per row
  with a float scale, rebuilt from standard ops (Gather -> Cast -> Mul), since the
  bundled ORT-web build has no GatherBlockQuantized.
usage: python q4export.py <fp32 model.onnx> <out model_q4.onnx>
"""
import sys
import numpy as np
import onnx
from onnx import helper, numpy_helper, TensorProto
from onnxruntime.quantization.matmul_nbits_quantizer import MatMulNBitsQuantizer, DefaultWeightOnlyQuantConfig

src, dst = sys.argv[1], sys.argv[2]
m = onnx.load(src)
q = MatMulNBitsQuantizer(m, algo_config=DefaultWeightOnlyQuantConfig(block_size=32, is_symmetric=True, op_types_to_quantize=("MatMul",)))
q.process()
m = q.model.model
g = m.graph
inits = {i.name: i for i in g.initializer}
new_nodes = []
done = 0
for node in list(g.node):
    if node.op_type == "Gather" and node.input[0] in inits:
        w = numpy_helper.to_array(inits[node.input[0]])
        if w.dtype == np.float32 and w.ndim == 2 and w.size >= 1_000_000:
            scale = np.abs(w).max(axis=1) / 127.0
            scale[scale == 0] = 1.0
            wq = np.clip(np.round(w / scale[:, None]), -127, 127).astype(np.int8)
            base = node.input[0]
            g.initializer.remove(inits[base])
            g.initializer.extend([numpy_helper.from_array(wq, base + "_int8"), numpy_helper.from_array(scale.astype(np.float32), base + "_scale")])
            ids = node.input[1]
            out = node.output[0]
            gq, gs, cf, us = (f"{base}_{s}" for s in ("gq", "gs", "cf", "us"))
            axes = base + "_axes"
            g.initializer.append(numpy_helper.from_array(np.array([-1], dtype=np.int64), axes))
            repl = [
                helper.make_node("Gather", [base + "_int8", ids], [gq], axis=0),
                helper.make_node("Gather", [base + "_scale", ids], [gs], axis=0),
                helper.make_node("Cast", [gq], [cf], to=TensorProto.FLOAT),
                helper.make_node("Unsqueeze", [gs, axes], [us]),
                helper.make_node("Mul", [cf, us], [out]),
            ]
            idx = list(g.node).index(node)
            g.node.remove(node)
            for k, n in enumerate(repl):
                g.node.insert(idx + k, n)
            done += 1
print("embedding tables int8:", done, "contrib ops:", sorted({n.op_type for n in g.node if n.domain == "com.microsoft"}))
onnx.save_model(m, dst, save_as_external_data=False)
import os
print("size MB", os.path.getsize(dst) / 1e6)
