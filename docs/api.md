# API

```text
POST /api/auth/register {username, email, password}
POST /api/auth/login {login, password}
GET  /api/users/me
GET  /api/users/search?q=
PATCH /api/profiles/me
GET  /api/@:username            (public)
GET  /api/documents
POST /api/documents
GET  /api/documents/:id
PATCH /api/documents/:id
DELETE /api/documents/:id
GET  /api/documents/:id/versions
GET  /api/folders?parent_id=
POST /api/folders
PATCH /api/folders/:id
DELETE /api/folders/:id
GET  /api/document-types
POST /api/document-types
POST /api/documents/:id/shares {username, role}
DELETE /api/documents/:id/shares/:userId
POST /api/documents/:id/public-link {show_on_profile}
DELETE /api/documents/:id/public-link
GET  /api/p/:token              (public, cacheable)
GET  /api/search?q=&type=
POST /api/search/reindex
POST /api/documents/:id/attachments/upload-url
GET  /health  GET /ready
```
