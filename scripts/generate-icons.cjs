const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];
const outputDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background - gradient from blue to purple
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#3B82F6');  // Blue-500
  gradient.addColorStop(1, '#8B5CF6');  // Violet-500

  // Rounded rectangle background
  const radius = size * 0.2;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw clipboard icon
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = size * 0.05;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const padding = size * 0.2;
  const clipWidth = size * 0.6;
  const clipHeight = size * 0.7;
  const clipX = (size - clipWidth) / 2;
  const clipY = (size - clipHeight) / 2 + size * 0.05;
  const clipRadius = size * 0.08;

  // Clipboard body
  ctx.beginPath();
  ctx.roundRect(clipX, clipY, clipWidth, clipHeight, clipRadius);
  ctx.stroke();

  // Clipboard clip at top
  const clipTabWidth = size * 0.3;
  const clipTabHeight = size * 0.12;
  const clipTabX = (size - clipTabWidth) / 2;
  const clipTabY = clipY - clipTabHeight * 0.3;
  const clipTabRadius = size * 0.04;

  ctx.beginPath();
  ctx.roundRect(clipTabX, clipTabY, clipTabWidth, clipTabHeight, clipTabRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Checkmark
  const checkSize = size * 0.25;
  const checkX = size * 0.3;
  const checkY = size * 0.5;

  ctx.beginPath();
  ctx.moveTo(checkX, checkY + checkSize * 0.4);
  ctx.lineTo(checkX + checkSize * 0.35, checkY + checkSize * 0.7);
  ctx.lineTo(checkX + checkSize, checkY);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = size * 0.08;
  ctx.stroke();

  // Task lines
  const lineX = size * 0.45;
  const lineY1 = size * 0.45;
  const lineY2 = size * 0.55;
  const lineY3 = size * 0.65;
  const lineLength = size * 0.25;

  ctx.lineWidth = size * 0.04;

  // Line 1
  ctx.beginPath();
  ctx.moveTo(lineX, lineY1);
  ctx.lineTo(lineX + lineLength, lineY1);
  ctx.stroke();

  // Line 2
  ctx.beginPath();
  ctx.moveTo(lineX, lineY2);
  ctx.lineTo(lineX + lineLength * 0.7, lineY2);
  ctx.stroke();

  // Line 3
  ctx.beginPath();
  ctx.moveTo(lineX, lineY3);
  ctx.lineTo(lineX + lineLength * 0.5, lineY3);
  ctx.stroke();

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(outputDir, `icon${size}.png`);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath}`);
}

// Generate all sizes
sizes.forEach(generateIcon);
console.log('All icons generated successfully!');
