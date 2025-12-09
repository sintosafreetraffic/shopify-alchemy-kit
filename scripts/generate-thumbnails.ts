#!/usr/bin/env node
/**
 * Video Thumbnail Generator Helper
 * 
 * This script prints FFmpeg commands for generating WebP thumbnails
 * from all product videos. It does NOT execute the commands - just
 * outputs them for copy-paste.
 * 
 * Usage: 
 *   npx tsx scripts/generate-thumbnails.ts
 *   
 * Or with ts-node:
 *   ts-node scripts/generate-thumbnails.ts
 * 
 * The generated thumbnails are used as poster images in:
 * - src/components/VideoSection.tsx (Ergonomic Pillow)
 * - src/components/KneePillowVideoSection.tsx (Knee Pillow)
 * - src/components/SleepMaskVideoSection.tsx (Sleep Mask)
 */

// =============================================================================
// Video Configuration - MUST match the paths used in the React components
// =============================================================================

const videoConfigs = {
  // VideoSection.tsx - Ergonomic Pillow PDP
  // Videos: /videos/video_*.mp4 → Thumbnails: /videos/thumbnails/video_*.webp
  ergonomicPillow: [
    { src: "video_1.mp4", thumbnail: "video_1.webp" },
    { src: "video_2.mp4", thumbnail: "video_2.webp" },
    { src: "video_3.mp4", thumbnail: "video_3.webp" },
    { src: "video_4.mp4", thumbnail: "video_4.webp" },
    { src: "video_5.mp4", thumbnail: "video_5.webp" },
  ],
  
  // KneePillowVideoSection.tsx - Knee Pillow PDP
  // Videos: /videos/knee-video-*.mp4 → Thumbnails: /videos/thumbnails/knee-video-*.webp
  kneePillow: [
    { src: "knee-video-2.mp4", thumbnail: "knee-video-2.webp" },
    { src: "knee-video-3.mp4", thumbnail: "knee-video-3.webp" },
    { src: "knee-video-4.mp4", thumbnail: "knee-video-4.webp" },
  ],
  
  // SleepMaskVideoSection.tsx - Sleep Mask PDP
  // Videos: /videos/video_*.mp4 → Thumbnails: /videos/thumbnails/sleepmask-video-*.webp
  // Note: Uses same source videos as ergonomic pillow but with different thumbnail names
  sleepMask: [
    { src: "video_1.mp4", thumbnail: "sleepmask-video-1.webp" },
    { src: "video_2.mp4", thumbnail: "sleepmask-video-2.webp" },
    { src: "video_3.mp4", thumbnail: "sleepmask-video-3.webp" },
    { src: "video_4.mp4", thumbnail: "sleepmask-video-4.webp" },
    { src: "video_5.mp4", thumbnail: "sleepmask-video-5.webp" },
  ],
};

// =============================================================================
// Command Generation
// =============================================================================

function generateCommand(src: string, thumbnail: string, timestamp = "00:00:01"): string {
  return `ffmpeg -i public/videos/${src} -ss ${timestamp} -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/${thumbnail}`;
}

function printSection(title: string, component: string, videos: { src: string; thumbnail: string }[]) {
  console.log("\n" + "─".repeat(60));
  console.log(`📁 ${title}`);
  console.log(`   Component: ${component}`);
  console.log("─".repeat(60));
  videos.forEach(({ src, thumbnail }) => {
    console.log(generateCommand(src, thumbnail));
  });
}

// =============================================================================
// CLI Output
// =============================================================================

console.log("\n" + "═".repeat(60));
console.log("🎬 Rise By Night - Video Thumbnail Generator");
console.log("═".repeat(60));
console.log(`
This script outputs FFmpeg commands to generate WebP thumbnails
for all product videos used in the storefront.

Prerequisites:
  • FFmpeg installed (https://ffmpeg.org/)
  • Videos exist in public/videos/

Output directory: public/videos/thumbnails/
`);

console.log("─".repeat(60));
console.log("Step 1: Create the thumbnails directory");
console.log("─".repeat(60));
console.log("mkdir -p public/videos/thumbnails");

printSection(
  "Ergonomic Pillow Videos",
  "src/components/VideoSection.tsx",
  videoConfigs.ergonomicPillow
);

printSection(
  "Knee Pillow Videos", 
  "src/components/KneePillowVideoSection.tsx",
  videoConfigs.kneePillow
);

printSection(
  "Sleep Mask Videos",
  "src/components/SleepMaskVideoSection.tsx",
  videoConfigs.sleepMask
);

console.log("\n" + "═".repeat(60));
console.log("✅ Copy and run the commands above in your terminal.");
console.log("═".repeat(60));
console.log(`
Tips:
  • Change -ss 00:00:01 to extract a different frame timestamp
  • Add -q:v 80 before output path for quality control (0-100)
  • Run commands from the project root directory
`);
