# Hosting

## Build

```bash
docker build -t erd-pets-build .
docker run --rm -v $(pwd)/dist:/out erd-pets-build sh -c "cp -r /app/dist/* /out/"
```

## Nginx config

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/erd-pets/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Place in `/etc/nginx/sites-available/`, symlink to `sites-enabled/`, then `nginx -t && systemctl reload nginx`.
