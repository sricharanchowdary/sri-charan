---
layout: ../../layouts/BlogPostLayout.astro
title: "What I Learned Shipping This Portfolio"
date: "2026-05-23"
description: "A short reflection on planning, building, testing, and deploying a small software project end to end."
---

This portfolio was a small project on purpose. The assignment was not only to
make pages, but to walk through the whole software lifecycle: plan, design,
build, test, deploy, monitor, and reflect.

The planning step helped me decide what not to build. I skipped comments,
search, authentication, and a CMS because they would add weight without helping
the core review. With only two blog posts, a searchable archive would be more
decoration than product value.

The build step reminded me that small sites still have real engineering edges:
dark mode should respect the operating system and persist user choice, contact
forms need server-side validation, and deployment needs automation so the repo
is the source of truth.

Testing was the best forcing function. Writing even a few unit tests for the
contact validator made the form behavior clearer, and the manual checklist
caught details that are easy to miss, especially at 320px width and with
keyboard navigation.

If I had more time, I would add final project repository links,
add automatic OG image generation, and run a proper accessibility audit on a
deployed URL. The version here is intentionally modest, but it is shippable.
