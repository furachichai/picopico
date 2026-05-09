import fs from 'fs';

const indexPath = 'index.html';
let html = fs.readFileSync(indexPath, 'utf8');

const script = `
<script>
  window.addEventListener('error', function(e) {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '0';
    errorDiv.style.left = '0';
    errorDiv.style.width = '100%';
    errorDiv.style.padding = '20px';
    errorDiv.style.backgroundColor = 'red';
    errorDiv.style.color = 'white';
    errorDiv.style.zIndex = '9999';
    errorDiv.innerText = e.message + '\\n' + e.error.stack;
    document.body.appendChild(errorDiv);
  });
</script>
`;

if (!html.includes('window.addEventListener(\\\'error\\\'')) {
  html = html.replace('</head>', script + '</head>');
  fs.writeFileSync(indexPath, html);
  console.log('Error catching script injected into index.html');
} else {
  console.log('Script already injected');
}
