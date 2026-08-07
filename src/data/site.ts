export const site = {
  name: 'Sri Charan',
  title: 'Sri Charan - Junior Software Engineer',
  description:
    'Portfolio of Sri Charan, a Data Science and AI student building practical machine learning and web systems.',
  url: import.meta.env.PUBLIC_SITE_URL ?? 'http://localhost:4321',
  repo: import.meta.env.PUBLIC_REPO_URL ?? 'https://github.com/sricharanchowdary/sri-charan',
  email: import.meta.env.PUBLIC_CONTACT_EMAIL ?? '',
  github: 'https://github.com/sricharanchowdary',
  whatsapp: 'https://wa.me/919390151046',
};

export const navItems = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/projects', label: 'Projects' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

export const projects = [
  {
    slug: 'retinal-image-analysis',
    title: 'Retinal Image Analysis for Diabetic Retinopathy',
    summary:
      'A deep learning pipeline that classifies diabetic retinopathy severity from retinal images and explains predictions with Grad-CAM.',
    problem:
      'Retinal screening is slow and specialist-dependent. The goal was to explore whether a student-built model could help triage diabetic retinopathy images while still being explainable.',
    approach:
      'I used transfer learning with EfficientNet-B3 and VGG16 features, class weighting for the imbalanced APTOS 2019 dataset, augmentation, and Grad-CAM overlays for interpretability.',
    outcome:
      'The prototype reached 88.5% test accuracy with a 0.91 AUC on the validation split and produced heatmaps that made model behavior easier to inspect.',
    next:
      'I would add stronger calibration, test on a second dataset, and build a review workflow with uncertainty scores before treating it as a clinical-support tool.',
    tech: ['Python', 'TensorFlow', 'EfficientNet', 'VGG16', 'Docker'],
    repo: '',
  },
  {
    slug: 'sentiment-analysis',
    title: 'Sentiment Analysis on Product Reviews',
    summary:
      'An NLP experiment that classifies product review sentiment and exposes the model through a small Flask interface.',
    problem:
      'Review data is noisy, repetitive, and hard to scan at scale. I wanted a simple model that could surface customer mood without requiring manual tagging.',
    approach:
      'I cleaned review text, compared baseline TF-IDF models against a fine-tuned transformer, and wrapped the best result in a lightweight API for demo use.',
    outcome:
      'The transformer model handled nuanced review wording better than the baseline and gave me a practical way to discuss model trade-offs with non-ML users.',
    next:
      'I would add confidence thresholds, multilingual reviews, and a dashboard that groups common complaints instead of stopping at positive or negative labels.',
    tech: ['Python', 'Hugging Face', 'BERT', 'Flask'],
    repo: '',
  },
  {
    slug: 'object-detection-system',
    title: 'Real-Time Object Detection System',
    summary:
      'A YOLOv8 and OpenCV prototype for detecting everyday objects from a camera stream in a browser-friendly demo.',
    problem:
      'Real-time models are easy to demo badly: high latency, unclear labels, and fragile camera handling. I wanted to understand the full pipeline from webcam frame to prediction.',
    approach:
      'I used YOLOv8 for detection, OpenCV for frame processing, and Streamlit for a quick interface so I could iterate on threshold settings and visual feedback.',
    outcome:
      'The demo produced stable detections on common objects and taught me how model size, frame rate, and confidence thresholds affect user trust.',
    next:
      'I would move inference behind an API, add metrics for latency, and test on lower-power hardware to make the experience more reliable.',
    tech: ['Python', 'YOLOv8', 'OpenCV', 'Streamlit'],
    repo: '',
  },
];
export { posts } from './posts';