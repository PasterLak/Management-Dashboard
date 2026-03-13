"""
Network helper functions to get private ip4 address
"""

import socket
import ipaddress


LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "::1"}


def _is_private_ipv4(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False

    return (
        isinstance(addr, ipaddress.IPv4Address)
        and addr.is_private
        and not addr.is_loopback
        and not addr.is_link_local
    )


def _ip_priority(ip: str) -> tuple[int, str]:
    """Lower number = better main address candidate."""
    if ip.startswith("192.168."):
        return (0, ip)

    if ip.startswith("172."):
        parts = ip.split(".")
        if len(parts) > 1 and parts[1].isdigit() and 16 <= int(parts[1]) <= 31:
            return (1, ip)

    if ip.startswith("10."):
        return (2, ip)

    return (3, ip)


def _find_private_ip() -> str | None:
    ips: set[str] = set()

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("1.1.1.1", 80))
            ip = s.getsockname()[0]
            if ip and _is_private_ipv4(ip):
                ips.add(ip)
    except OSError:
        pass

    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip and _is_private_ipv4(ip):
                ips.add(ip)
    except OSError:
        pass

    try:
        for ip in socket.gethostbyname_ex(socket.gethostname())[2]:
            if ip and _is_private_ipv4(ip):
                ips.add(ip)
    except OSError:
        pass

    if ips:
        return sorted(ips, key=_ip_priority)[0]

    return None


def _collect_private_ips() -> list[str]:
    ips: set[str] = set()

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("1.1.1.1", 80))
            ip = s.getsockname()[0]
            if ip and _is_private_ipv4(ip):
                ips.add(ip)
    except OSError:
        pass

    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip and _is_private_ipv4(ip):
                ips.add(ip)
    except OSError:
        pass

    try:
        for ip in socket.gethostbyname_ex(socket.gethostname())[2]:
            if ip and _is_private_ipv4(ip):
                ips.add(ip)
    except OSError:
        pass

    return sorted(ips, key=_ip_priority)


def resolve_dashboard_endpoints(request_host: str, request_host_url: str, port: int) -> list[str]:
    host = (request_host or "").split(":")[0].strip().lower()
    current_endpoint = request_host_url.rstrip("/")

    if host in LOOPBACK_HOSTS:
        private_ips = _collect_private_ips()
        if not private_ips:
            return []

        if port in (80, 443):
            return [f"http://{ip}" for ip in private_ips]
        return [f"http://{ip}:{port}" for ip in private_ips]

    return [current_endpoint]


def resolve_current_endpoint(request_host: str, request_host_url: str, port: int) -> str:
    endpoints = resolve_dashboard_endpoints(request_host, request_host_url, port)
    if endpoints:
        return endpoints[0]
    return request_host_url.rstrip("/")
