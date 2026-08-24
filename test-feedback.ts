import app from './artifacts/api-server/src/app';

// Let's inspect all registered routes in app
function printRoutes(stack: any[], prefix = '') {
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
      console.log(${methods} );
    } else if (layer.name === 'router' && layer.handle?.stack) {
      let nextPrefix = prefix;
      if (layer.regexp) {
        const match = layer.regexp.source
          .replace('^\\', '')
          .replace('\\/?(?=\\/|$)', '')
          .replace('(?=\\/|$)', '')
          .replace('^', '')
          .replace('\\/', '/');
        if (match && !match.startsWith('(?=')) {
          nextPrefix = prefix + match;
        }
      }
      printRoutes(layer.handle.stack, nextPrefix);
    }
  }
}

console.log('--- Registered Routes in App ---');
printRoutes(app._router.stack);
