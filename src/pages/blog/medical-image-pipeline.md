---
layout: ../../layouts/BlogPostLayout.astro
title: "Building a Deep Learning Pipeline for Medical Image Analysis"
date: "2026-05-20"
description: "Notes from building an interpretable diabetic retinopathy classification pipeline."
---

Medical image analysis looks exciting from the outside because the model metrics
are easy to celebrate. The harder part is making the work useful enough that a
person could understand what the model is doing and where it might fail.

For my diabetic retinopathy project, I used the APTOS 2019 retinal image
dataset and experimented with transfer learning. EfficientNet-B3 gave me a
strong starting point for feature extraction, while VGG16 helped me think about
fine-grained structures such as vessel patterns and lesions.

The most important implementation choices were not glamorous:

- Resize and normalize images consistently.
- Use augmentation carefully so the model sees realistic variation.
- Apply class weights because the dataset is imbalanced.
- Track AUC and confusion matrices instead of relying only on accuracy.
- Generate Grad-CAM overlays so predictions are easier to inspect.

The prototype reached 88.5% accuracy and 0.91 AUC on my validation split. That
was encouraging, but it did not make the project "medical grade." The model
still needs calibration, external validation, and a workflow where uncertain
cases are clearly handed back to a human reviewer.

The biggest lesson was that trust is part of the product. A model that says
"severe" without explanation is less useful than a slightly simpler model that
shows what image regions shaped the decision.
