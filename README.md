Automatic YourHosting DNS
=========================

'Dynamic-DNS' script for YourHosting DNS. It will watch given sub-domains and your current ISP IP. On IP-change DNS is updated.

Example Docker Compose file
---------------------------

```
version: "3"

services:
  yourhosting-dns:
    image: ghcr.io/jnolles/ha-yh-dyn-dns:main
    restart: unless-stopped
    environment:
      - YH_IDENTITY=yourusername
      - YH_PASSWORD=yourpassword
      - DOMAIN=yourdomain.com
      - SUBDOMAINS=one,two,three
      - DNS=8.8.8.8
      - INTERVAL=600
```
