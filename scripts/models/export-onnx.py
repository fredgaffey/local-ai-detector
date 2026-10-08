"""Export an HF text-classification AI detector to the layout the engine loads:
<out>/<name>/{config.json, tokenizer.json, tokenizer_config.json, onnx/model.onnx, onnx/model_quantized.onnx}

Single-logit heads (sigmoid) are wrapped to emit two logits [0, x], so
softmax(...)[1] == sigmoid(x) and id2label is {0: human, 1: ai}.
desklib's custom DesklibAIDetectionModel (DeBERTa-v3 + mean pooling + linear)
is rebuilt here from its published definition.

usage: python convert.py <hf repo> <out dir> <name>
"""
import json, os, sys
import torch
import torch.nn as nn
from transformers import AutoConfig, AutoModel, AutoModelForSequenceClassification, AutoTokenizer, PreTrainedModel
from onnxruntime.quantization import quantize_dynamic, QuantType

repo, out_root, name = sys.argv[1], sys.argv[2], sys.argv[3]
out = os.path.join(out_root, name)
os.makedirs(os.path.join(out, "onnx"), exist_ok=True)

tok = AutoTokenizer.from_pretrained(repo)
cfg = AutoConfig.from_pretrained(repo)


class Desklib(PreTrainedModel):
    config_class = AutoConfig

    def __init__(self, config):
        super().__init__(config)
        self.model = AutoModel.from_config(config)
        self.classifier = nn.Linear(config.hidden_size, 1)

    def forward(self, input_ids, attention_mask):
        h = self.model(input_ids=input_ids, attention_mask=attention_mask)[0]
        m = attention_mask.unsqueeze(-1).expand(h.size()).float()
        pooled = (h * m).sum(1) / m.sum(1).clamp(min=1e-9)
        return self.classifier(pooled)


if cfg.architectures and cfg.architectures[0] == "DesklibAIDetectionModel":
    base = Desklib.from_pretrained(repo)
else:
    base = AutoModelForSequenceClassification.from_pretrained(repo)
base.eval()


class Wrap(nn.Module):
    def __init__(self, m):
        super().__init__()
        self.m = m

    def forward(self, input_ids, attention_mask):
        out = self.m(input_ids=input_ids, attention_mask=attention_mask)
        logits = out if torch.is_tensor(out) else out.logits
        if logits.shape[-1] == 1:
            logits = torch.cat([torch.zeros_like(logits), logits], dim=-1)
        return logits


w = Wrap(base).eval()
enc = tok(["A short sample sentence to trace the graph.", "Another one."], return_tensors="pt", padding=True)
with torch.no_grad():
    ref = w(enc["input_ids"], enc["attention_mask"])
n_labels = ref.shape[-1]

onnx_path = os.path.join(out, "onnx", "model.onnx")
torch.onnx.export(
    w,
    (enc["input_ids"], enc["attention_mask"]),
    onnx_path,
    input_names=["input_ids", "attention_mask"],
    output_names=["logits"],
    dynamic_axes={"input_ids": {0: "b", 1: "s"}, "attention_mask": {0: "b", 1: "s"}, "logits": {0: "b"}},
    opset_version=17,
    dynamo=False,
)
quantize_dynamic(onnx_path, os.path.join(out, "onnx", "model_quantized.onnx"), weight_type=QuantType.QInt8)

# Labels: keep the model's own when it has two named ones, else index 1 = AI.
id2label = getattr(cfg, "id2label", None) or {}
names = {int(k): str(v) for k, v in id2label.items()}
if n_labels != 2 or len(names) != 2 or all(v.upper().startswith("LABEL_") for v in names.values()):
    names = {0: "human", 1: "ai"}
c = cfg.to_dict()
c["id2label"] = {str(k): v for k, v in names.items()}
c["label2id"] = {v: k for k, v in names.items()}
c["num_labels"] = 2
if c.get("architectures") == ["DesklibAIDetectionModel"]:
    c["architectures"] = ["DebertaV2ForSequenceClassification"]
json.dump(c, open(os.path.join(out, "config.json"), "w"), indent=1)
tok.save_pretrained(out)

import onnxruntime as ort
import numpy as np
for f in ["model.onnx", "model_quantized.onnx"]:
    s = ort.InferenceSession(os.path.join(out, "onnx", f), providers=["CPUExecutionProvider"])
    got = s.run(None, {"input_ids": enc["input_ids"].numpy(), "attention_mask": enc["attention_mask"].numpy()})[0]
    print(name, f, "max |diff| vs torch:", float(np.abs(got - ref.numpy()).max()))
print(name, "labels", names, "files", sorted(os.listdir(out)))
