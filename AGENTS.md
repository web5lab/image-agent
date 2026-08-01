# AGENTS.md

ImageMCP Server Agent Skill definitions and AI assistant guidelines.

- Use `./skills/imagemcp/scripts/imagemcp.js` to execute all ImageMCP image generation, image editing, model configuration, API key management, and telemetry logging operations.
- **Quality Evaluation Protocol**: Evaluate output quality (prompt fidelity, resolution, visual artifacts). If unsatisfied, automatically re-try generation up to 2-3 times by refining the prompt or switching models (`google/gemini-2.5-flash-image`, `black-forest-labs/flux-1.1-pro`, `recraft-v3`, `ideogram-v2`).
- **Image Editing**: Use `./skills/imagemcp/scripts/imagemcp.js edit --image <path_or_url> --prompt "<edits>"` to modify, transform, or refine existing images.
