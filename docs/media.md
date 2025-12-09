# Media Assets Guide

## Video Thumbnails

All product videos should have WebP thumbnail images for optimal performance. Thumbnails are displayed as poster images before videos load and play.

### Directory Structure

```
public/
├── videos/
│   ├── video_1.mp4
│   ├── video_2.mp4
│   ├── video_3.mp4
│   ├── video_4.mp4
│   ├── video_5.mp4
│   ├── knee-video-1.mp4
│   ├── knee-video-2.mp4
│   ├── knee-video-3.mp4
│   ├── knee-video-4.mp4
│   └── thumbnails/
│       ├── video_1.webp
│       ├── video_2.webp
│       ├── video_3.webp
│       ├── video_4.webp
│       ├── video_5.webp
│       ├── knee-video-2.webp
│       ├── knee-video-3.webp
│       ├── knee-video-4.webp
│       ├── sleepmask-video-1.webp
│       ├── sleepmask-video-2.webp
│       ├── sleepmask-video-3.webp
│       ├── sleepmask-video-4.webp
│       └── sleepmask-video-5.webp
```

### Generating Thumbnails with FFmpeg

Use FFmpeg to extract a frame from each video and convert it to WebP format.

#### Basic Command

```bash
# Extract frame at 1 second, scale to 720px width, output as WebP
ffmpeg -i public/videos/video_1.mp4 -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/video_1.webp
```

#### Ergonomic Pillow Videos

```bash
ffmpeg -i public/videos/video_1.mp4 -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/video_1.webp
ffmpeg -i public/videos/video_2.mp4 -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/video_2.webp
ffmpeg -i public/videos/video_3.mp4 -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/video_3.webp
ffmpeg -i public/videos/video_4.mp4 -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/video_4.webp
ffmpeg -i public/videos/video_5.mp4 -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/video_5.webp
```

#### Knee Pillow Videos

```bash
ffmpeg -i public/videos/knee-video-2.mp4 -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/knee-video-2.webp
ffmpeg -i public/videos/knee-video-3.mp4 -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/knee-video-3.webp
ffmpeg -i public/videos/knee-video-4.mp4 -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/knee-video-4.webp
```

#### Sleep Mask Videos (uses same source videos with different thumbnail names)

```bash
ffmpeg -i public/videos/video_1.mp4 -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/sleepmask-video-1.webp
ffmpeg -i public/videos/video_2.mp4 -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/sleepmask-video-2.webp
ffmpeg -i public/videos/video_3.mp4 -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/sleepmask-video-3.webp
ffmpeg -i public/videos/video_4.mp4 -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/sleepmask-video-4.webp
ffmpeg -i public/videos/video_5.mp4 -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/sleepmask-video-5.webp
```

### Helper Script

A helper script is available at `scripts/generate-thumbnails.ts` that prints all required FFmpeg commands based on your current video files:

```bash
npx tsx scripts/generate-thumbnails.ts
```

This outputs copy-paste ready commands for all videos.

### FFmpeg Options Explained

| Option | Description |
|--------|-------------|
| `-i` | Input file |
| `-ss 00:00:01` | Seek to 1 second into the video |
| `-vframes 1` | Extract only 1 frame |
| `-vf "scale=720:-1"` | Scale width to 720px, maintain aspect ratio |

### Tips

- Choose a timestamp (`-ss`) that shows an appealing frame
- Use `-q:v 80` for WebP quality control (0-100, higher = better)
- Ensure the `thumbnails` directory exists before running commands
