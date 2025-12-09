/**
 * Video Thumbnail Generator Helper
 * 
 * This script prints FFmpeg commands for generating WebP thumbnails
 * from all product videos. It does NOT execute the commands - just
 * outputs them for copy-paste.
 * 
 * Usage: npx tsx scripts/generate-thumbnails.ts
 */

// Video configurations matching the components
const videoConfigs = {
  // VideoSection.tsx - Ergonomic Pillow videos
  ergonomicPillow: [
    { src: "video_1.mp4", thumbnail: "video_1.webp" },
    { src: "video_2.mp4", thumbnail: "video_2.webp" },
    { src: "video_3.mp4", thumbnail: "video_3.webp" },
    { src: "video_4.mp4", thumbnail: "video_4.webp" },
    { src: "video_5.mp4", thumbnail: "video_5.webp" },
  ],
  
  // KneePillowVideoSection.tsx - Knee Pillow videos
  kneePillow: [
    { src: "knee-video-2.mp4", thumbnail: "knee-video-2.webp" },
    { src: "knee-video-3.mp4", thumbnail: "knee-video-3.webp" },
    { src: "knee-video-4.mp4", thumbnail: "knee-video-4.webp" },
  ],
  
  // SleepMaskVideoSection.tsx - Sleep Mask videos (same source, different thumbnails)
  sleepMask: [
    { src: "video_1.mp4", thumbnail: "sleepmask-video-1.webp" },
    { src: "video_2.mp4", thumbnail: "sleepmask-video-2.webp" },
    { src: "video_3.mp4", thumbnail: "sleepmask-video-3.webp" },
    { src: "video_4.mp4", thumbnail: "sleepmask-video-4.webp" },
    { src: "video_5.mp4", thumbnail: "sleepmask-video-5.webp" },
  ],
};

function generateCommand(src: string, thumbnail: string): string {
  return `ffmpeg -i public/videos/${src} -ss 00:00:01 -vframes 1 -vf "scale=720:-1" public/videos/thumbnails/${thumbnail}`;
}

console.log("=".repeat(60));
console.log("Video Thumbnail Generation Commands");
console.log("=".repeat(60));
console.log("\nFirst, create the thumbnails directory if it doesn't exist:");
console.log("mkdir -p public/videos/thumbnails\n");

console.log("-".repeat(60));
console.log("Ergonomic Pillow Videos (VideoSection.tsx)");
console.log("-".repeat(60));
videoConfigs.ergonomicPillow.forEach(({ src, thumbnail }) => {
  console.log(generateCommand(src, thumbnail));
});

console.log("\n" + "-".repeat(60));
console.log("Knee Pillow Videos (KneePillowVideoSection.tsx)");
console.log("-".repeat(60));
videoConfigs.kneePillow.forEach(({ src, thumbnail }) => {
  console.log(generateCommand(src, thumbnail));
});

console.log("\n" + "-".repeat(60));
console.log("Sleep Mask Videos (SleepMaskVideoSection.tsx)");
console.log("-".repeat(60));
videoConfigs.sleepMask.forEach(({ src, thumbnail }) => {
  console.log(generateCommand(src, thumbnail));
});

console.log("\n" + "=".repeat(60));
console.log("Copy and run the commands above in your terminal.");
console.log("Requires FFmpeg to be installed: https://ffmpeg.org/");
console.log("=".repeat(60));
