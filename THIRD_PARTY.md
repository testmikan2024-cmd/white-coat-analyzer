# Third-party components

- ONNX Runtime Web 1.20.1, Microsoft, MIT License.
  Source: https://github.com/microsoft/onnxruntime/tree/v1.20.1
  Package: https://registry.npmjs.org/onnxruntime-web/-/onnxruntime-web-1.20.1.tgz
  Unmodified distribution files copied to 同じフォルダー. License and third-party notices are included there.
- U²-Net / u2netp, Xuebin Qin et al., Apache-2.0 upstream project.
  Source: https://github.com/xuebinqin/U-2-Net
  Unmodified ONNX weights distributed by rembg: https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx
  MD5: 8e83ca70e441ab06c318d82300c84806
  SHA256: 309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8
  Upstream license included as U2Net-LICENSE.txt.
- rembg model contract / normalization reference, Daniel Gatis et al., MIT project.
  https://github.com/danielgatis/rembg/blob/main/rembg/sessions/u2netp.py
  https://github.com/danielgatis/rembg/blob/main/rembg/sessions/base.py
  License included as rembg-LICENSE.txt.

App-specific files are new or modified for this project. ONNX conversion is provided by rembg; no additional fruit-specific training has been performed. Background removal is not a validated fruit-versus-hand classifier.
