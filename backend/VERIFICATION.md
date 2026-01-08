# Production API Verification Steps

After deployment, verify the following endpoints work correctly without redirects and with proper HTTPS/CORS.

## 1. Courses Endpoint (No Redirect)

```bash
curl -i https://compgradtoolbox-production.up.railway.app/api/courses
```

**Expected:**
- Status: `200 OK` (NOT 307, 301, or 404)
- No `Location:` header
- Response body: JSON array of courses

**Also verify backward compatibility:**
```bash
curl -i https://compgradtoolbox-production.up.railway.app/courses
```
Should also return `200 OK` (no redirect).

## 2. OPTIONS Preflight (CORS)

```bash
curl -i -X OPTIONS "https://compgradtoolbox-production.up.railway.app/api/login" \
  -H "Origin: https://compgradtoolbox.online" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

**Expected:**
- Status: `200 OK` or `204 No Content` (NOT 502, 404, or 405)
- Headers must include:
  - `Access-Control-Allow-Origin: https://compgradtoolbox.online`
  - `Access-Control-Allow-Methods: POST` (or `*`)
  - `Access-Control-Allow-Headers: content-type` (or `*`)
  - `Access-Control-Allow-Credentials: true`

## 3. Login POST Request

```bash
curl -i -X POST "https://compgradtoolbox-production.up.railway.app/api/login" \
  -H "Origin: https://compgradtoolbox.online" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin1","password":"admin123"}'
```

**Expected:**
- Status: `200 OK` (NOT 502, 404, or CORS error)
- Response body: JSON with user data or error message
- CORS headers present if request includes `Origin` header

## 4. Verify HTTPS Scheme Preservation

Check that any redirects (if they occur) use `https://` not `http://`:

```bash
curl -I https://compgradtoolbox-production.up.railway.app/api/courses 2>&1 | grep -i location
```

**Expected:**
- No `Location:` header (since we disabled redirects)
- If `Location:` header exists, it MUST start with `https://`

## Common Issues

- **502 Bad Gateway**: Check that uvicorn is running with `--proxy-headers --forwarded-allow-ips="*"`
- **307 Redirect with http://**: ProxyHeadersMiddleware not working, check middleware order
- **404 on /api/courses**: Router not included with `/api/courses` prefix
- **CORS errors**: Check `ALLOWED_ORIGINS` environment variable includes production domain

