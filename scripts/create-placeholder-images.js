const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const outputDir = path.join(__dirname, '../public/assets/images/products');

// Create directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to create a placeholder product image
function createProductImage(filename, width, height, backgroundColor, text) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Draw bottle shape
  ctx.fillStyle = '#ffffff';
  
  // Bottle body
  const bottleWidth = width * 0.6;
  const bottleHeight = height * 0.75;
  const bottleX = (width - bottleWidth) / 2;
  const bottleY = height * 0.15;
  
  // Rounded rectangle for bottle
  const radius = bottleWidth * 0.2;
  ctx.beginPath();
  ctx.moveTo(bottleX + radius, bottleY);
  ctx.lineTo(bottleX + bottleWidth - radius, bottleY);
  ctx.quadraticCurveTo(bottleX + bottleWidth, bottleY, bottleX + bottleWidth, bottleY + radius);
  ctx.lineTo(bottleX + bottleWidth, bottleY + bottleHeight - radius);
  ctx.quadraticCurveTo(bottleX + bottleWidth, bottleY + bottleHeight, bottleX + bottleWidth - radius, bottleY + bottleHeight);
  ctx.lineTo(bottleX + radius, bottleY + bottleHeight);
  ctx.quadraticCurveTo(bottleX, bottleY + bottleHeight, bottleX, bottleY + bottleHeight - radius);
  ctx.lineTo(bottleX, bottleY + radius);
  ctx.quadraticCurveTo(bottleX, bottleY, bottleX + radius, bottleY);
  ctx.closePath();
  ctx.fill();
  
  // Bottle cap
  const capWidth = bottleWidth * 0.4;
  const capHeight = height * 0.08;
  const capX = bottleX + (bottleWidth - capWidth) / 2;
  const capY = bottleY - capHeight;
  
  ctx.fillStyle = '#f1c40f';
  ctx.fillRect(capX, capY, capWidth, capHeight);
  
  // Label
  const labelWidth = bottleWidth * 0.8;
  const labelHeight = bottleHeight * 0.4;
  const labelX = bottleX + (bottleWidth - labelWidth) / 2;
  const labelY = bottleY + bottleHeight * 0.3;
  
  ctx.fillStyle = '#3498db';
  ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
  
  // Product name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, labelY + labelHeight / 2);
  
  // Save the image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(outputDir, filename), buffer);
  
  console.log(`Created ${filename}`);
}

// Create main product image
createProductImage('product-main.png', 500, 700, '#f0f0f0', 'Wasgeurtje Lavendel');

// Create secondary product image
createProductImage('product-secondary.png', 400, 600, '#f0f0f0', 'Wasgeurtje Vanille');

console.log('Placeholder images created successfully!'); 