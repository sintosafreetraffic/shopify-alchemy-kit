# Media Assets Guide

## Video Thumbnails

All product videos should have WebP thumbnail images for optimal performance. Thumbnails are displayed as poster images before videos load and play.

### Quick Start

Run the helper script to print all required FFmpeg commands:

```bash
npx tsx scripts/generate-thumbnails.ts
```

This outputs copy-paste ready commands for all videos, grouped by product section.

### Directory Structure

```
public/
├── videos/
│   ├── video_1.mp4          # Ergonomic Pillow / Sleep Mask source
│   ├── video_2.mp4
│   ├── video_3.mp4
│   ├── video_4.mp4
│   ├── video_5.mp4
│   ├── knee-video-2.mp4     # Knee Pillow source
│   ├── knee-video-3.mp4
│   ├── knee-video-4.mp4
│   └── thumbnails/
│       ├── video_1.webp           # VideoSection.tsx
│       ├── video_2.webp
│       ├── video_3.webp
│       ├── video_4.webp
│       ├── video_5.webp
│       ├── knee-video-2.webp      # KneePillowVideoSection.tsx
│       ├── knee-video-3.webp
│       ├── knee-video-4.webp
│       ├── sleepmask-video-1.webp # SleepMaskVideoSection.tsx
│       ├── sleepmask-video-2.webp
│       ├── sleepmask-video-3.webp
│       ├── sleepmask-video-4.webp
│       └── sleepmask-video-5.webp
```

### Component → Thumbnail Mapping

| Component | Video Source | Thumbnail Output |
|-----------|--------------|------------------|
| `VideoSection.tsx` | `video_*.mp4` | `video_*.webp` |
| `KneePillowVideoSection.tsx` | `knee-video-*.mp4` | `knee-video-*.webp` |
| `SleepMaskVideoSection.tsx` | `video_*.mp4` | `sleepmask-video-*.webp` |

### Example Commands

#### Ergonomic Pillow (VideoSection.tsx)

```bash
ffmpeg -i public/videos/video_1.mp4 -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/video_1.webp
```

#### Knee Pillow (KneePillowVideoSection.tsx)

```bash
ffmpeg -i public/videos/knee-video-2.mp4 -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/knee-video-2.webp
```

#### Sleep Mask (SleepMaskVideoSection.tsx)

```bash
# Note: Same source video as ergonomic pillow, different thumbnail name
ffmpeg -i public/videos/video_1.mp4 -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/sleepmask-video-1.webp
```

### FFmpeg Options Explained

| Option | Description |
|--------|-------------|
| `-i` | Input file path |
| `-ss 00:00:01` | Seek to 1 second into the video (change for different frame) |
| `-vframes 1` | Extract only 1 frame |
| `-vf "scale=720:-1"` | Scale width to 720px, maintain aspect ratio |

### Tips

- Choose a timestamp (`-ss`) that shows an appealing, representative frame
- Add `-q:v 80` before the output path for WebP quality control (0-100, higher = better)
- Ensure the `thumbnails` directory exists before running: `mkdir -p public/videos/thumbnails`
- Run commands from the project root directory
