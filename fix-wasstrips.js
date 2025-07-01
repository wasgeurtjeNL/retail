const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'wasstrips-applications', 'page.tsx');

try {
  // Read the file content
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Look for all instances of 'const filteredApplications = useMemo'
  const searchString = 'const filteredApplications = useMemo';
  let position = 0;
  const occurrences = [];
  
  // Find all occurrences
  while ((position = content.indexOf(searchString, position)) !== -1) {
    occurrences.push(position);
    position += searchString.length;
  }
  
  console.log(`Found ${occurrences.length} occurrences at positions: ${occurrences.join(', ')}`);
  
  if (occurrences.length >= 2) {
    // Get the full block of code for the second occurrence
    // First, find the start of the comment line
    const commentStart = content.lastIndexOf('\n', occurrences[1]) + 1;
    
    // Then find the end of the declaration block (end of useMemo with dependencies)
    const blockEnd = content.indexOf(']);', occurrences[1]);
    if (blockEnd === -1) {
      console.log('Could not find end of block');
      process.exit(1);
    }
    
    const fullEnd = blockEnd + 3; // Include the ']);'
    
    // Replace the entire block with a comment
    const updatedContent = 
      content.substring(0, commentStart) + 
      '  // Filtered applications already defined above\n' + 
      content.substring(fullEnd);
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, updatedContent);
    
    console.log('Successfully fixed duplicate declaration');
  } else {
    console.log('Not enough occurrences found to fix');
  }
} catch (error) {
  console.error('Error fixing duplicate declaration:', error);
} 