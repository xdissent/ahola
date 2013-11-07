ahola
=====

DNS proxy with mDNS support

Ahola is a DNS proxy server that intercepts mDNS A record queries and resolves
them via Avahi's DBus interface. It proxies queries for non-local domains to a
set of provided nameservers.