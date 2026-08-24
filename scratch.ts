import app from './artifacts/api-server/src/app';

const routes = [];
app._router.stack.forEach(layer => {
    if (layer.name === 'router' && layer.regexp.toString().includes('api')) {
        layer.handle.stack.forEach(apiLayer => {
            if (apiLayer.name === 'router') {
                apiLayer.handle.stack.forEach(subLayer => {
                    if (subLayer.route) {
                        routes.push(Object.keys(subLayer.route.methods)[0].toUpperCase() + ' ' + subLayer.route.path);
                    }
                });
            }
        });
    }
});
console.log(routes.filter(r => r.includes('feedback')));
