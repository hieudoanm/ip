import { NextPage } from 'next';
import { useEffect, useState } from 'react';

type IPInfo = {
	ip: string;
	version: string;
	city?: string;
	region?: string;
	country_name?: string;
	country_code?: string;
	postal?: string;
	latitude?: number | string;
	longitude?: number | string;
	timezone?: string;
	org?: string;
	asn?: string;
};

const AppPage: NextPage = () => {
	const [ipInfo, setIpInfo] = useState<IPInfo | null>(null);
	const [provider, setProvider] = useState<string | null>(null);
	const [vpnDetected, setVpnDetected] = useState(false);

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [domain, setDomain] = useState('');
	const [dnsResult, setDnsResult] = useState<any>(null);
	const [dnsLoading, setDnsLoading] = useState(false);

	const [rawOpen, setRawOpen] = useState(false);

	const detectVPN = (org?: string) => {
		if (!org) return false;
		const lower = org.toLowerCase();
		return (
			lower.includes('cloudflare') ||
			lower.includes('amazon') ||
			lower.includes('google') ||
			lower.includes('digitalocean') ||
			lower.includes('microsoft')
		);
	};

	const fetchFromIPInfo = async (ip: string) => {
		const res = await fetch(`https://ipinfo.io/${ip}/json`);
		if (!res.ok) throw new Error('IPinfo failed');
		const data = await res.json();

		return {
			parsed: {
				ip: data.ip,
				version: data.ip.includes(':') ? 'IPv6' : 'IPv4',
				city: data.city,
				region: data.region,
				country_name: data.country,
				country_code: data.country,
				postal: data.postal,
				latitude: data.loc?.split(',')[0],
				longitude: data.loc?.split(',')[1],
				timezone: data.timezone,
				org: data.org,
				asn: data.org,
			},
			provider: 'IPinfo',
		};
	};

	const fetchFromIpapi = async (ip: string) => {
		const res = await fetch(`https://ipapi.co/${ip}/json/`);
		if (!res.ok) throw new Error('ipapi failed');
		const data = await res.json();

		return {
			parsed: {
				ip: data.ip,
				version: data.version,
				city: data.city,
				region: data.region,
				country_name: data.country_name,
				country_code: data.country_code,
				postal: data.postal,
				latitude: data.latitude,
				longitude: data.longitude,
				timezone: data.timezone,
				org: data.org,
				asn: data.asn,
			},
			provider: 'ipapi',
		};
	};

	const fetchIPInfo = async () => {
		try {
			setLoading(true);
			setError(null);

			const ipRes = await fetch('https://api.ipify.org?format=json');
			if (!ipRes.ok) throw new Error('Failed to fetch IP');
			const { ip } = await ipRes.json();

			let result;
			try {
				result = await fetchFromIPInfo(ip);
			} catch {
				result = await fetchFromIpapi(ip);
			}

			setIpInfo(result.parsed);
			setProvider(result.provider);
			setVpnDetected(detectVPN(result.parsed.org));
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const fetchDNS = async () => {
		if (!domain) return;

		try {
			setDnsLoading(true);
			setDnsResult(null);

			const res = await fetch(
				`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`,
				{ headers: { accept: 'application/dns-json' } },
			);

			if (!res.ok) throw new Error('DNS lookup failed');

			const data = await res.json();
			setDnsResult(data);
		} catch (err: any) {
			setDnsResult({ error: err.message });
		} finally {
			setDnsLoading(false);
		}
	};

	useEffect(() => {
		fetchIPInfo();
	}, []);

	return (
		<div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-neutral-900 to-black p-6">
			{/* Gold glow background */}
			<div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-yellow-500 opacity-10 blur-3xl"></div>
			<div className="pointer-events-none absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-yellow-400 opacity-10 blur-3xl"></div>

			<div className="animate-fadeIn relative mx-auto max-w-5xl space-y-6">
				{/* Header */}
				<div className="card border border-yellow-500/20 bg-black/40 shadow-2xl shadow-yellow-500/10 backdrop-blur-2xl">
					<div className="card-body">
						<h1 className="card-title text-3xl text-yellow-400">
							IP Inspector
						</h1>
						<p className="text-sm text-neutral-400">
							Pure frontend • Fallback enabled • No data stored
						</p>

						{provider && (
							<div className="badge badge-outline mt-2 border-yellow-500 text-yellow-400">
								Provider: {provider}
							</div>
						)}

						<button
							onClick={fetchIPInfo}
							className="btn btn-warning btn-sm mt-4 w-fit">
							Refresh My IP
						</button>
					</div>
				</div>

				{/* VPN Warning */}
				{vpnDetected && (
					<div className="alert border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 backdrop-blur-xl">
						⚠️ Shared hosting / VPN detected. Rate limiting may occur.
					</div>
				)}

				{loading && (
					<div className="flex justify-center">
						<span className="loading loading-spinner loading-lg text-warning"></span>
					</div>
				)}

				{error && <div className="alert alert-error shadow-lg">{error}</div>}

				{/* IP Info */}
				{ipInfo && (
					<div className="grid gap-6 md:grid-cols-2">
						<div className="card border border-yellow-500/20 bg-black/40 shadow-xl backdrop-blur-xl">
							<div className="card-body">
								<h2 className="card-title text-yellow-400">Network Info</h2>
								<div className="space-y-2 text-sm text-neutral-300">
									<div>
										<strong>IP:</strong> {ipInfo.ip}
									</div>
									<div>
										<strong>Version:</strong> {ipInfo.version}
									</div>
									<div>
										<strong>ASN:</strong> {ipInfo.asn}
									</div>
									<div>
										<strong>Organization:</strong> {ipInfo.org}
									</div>
									<div>
										<strong>Timezone:</strong> {ipInfo.timezone}
									</div>
								</div>
							</div>
						</div>

						<div className="card border border-yellow-500/20 bg-black/40 shadow-xl backdrop-blur-xl">
							<div className="card-body">
								<h2 className="card-title text-yellow-400">Location</h2>
								<div className="space-y-2 text-sm text-neutral-300">
									<div>
										<strong>Country:</strong> {ipInfo.country_name}
									</div>
									<div>
										<strong>Region:</strong> {ipInfo.region}
									</div>
									<div>
										<strong>City:</strong> {ipInfo.city}
									</div>
									<div>
										<strong>Postal:</strong> {ipInfo.postal}
									</div>
									<div>
										<strong>Coordinates:</strong> {ipInfo.latitude},{' '}
										{ipInfo.longitude}
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* DNS */}
				<div className="card border border-yellow-500/20 bg-black/40 shadow-xl backdrop-blur-xl">
					<div className="card-body">
						<h2 className="card-title text-yellow-400">
							DNS Lookup (A Record)
						</h2>
						<div className="flex gap-2">
							<input
								type="text"
								placeholder="example.com"
								className="input input-bordered w-full border-yellow-500/30 bg-black/30 focus:border-yellow-400"
								value={domain}
								onChange={(e) => setDomain(e.target.value)}
							/>
							<button onClick={fetchDNS} className="btn btn-warning">
								Lookup
							</button>
						</div>

						{dnsLoading && (
							<span className="loading loading-spinner text-warning mt-4"></span>
						)}

						{dnsResult && (
							<div className="mt-4 max-h-60 overflow-auto text-sm">
								<pre className="rounded bg-black/40 p-4 text-neutral-300">
									{JSON.stringify(dnsResult, null, 2)}
								</pre>
							</div>
						)}
					</div>
				</div>

				{/* Raw JSON */}
				{ipInfo && (
					<div className="card border border-yellow-500/20 bg-black/40 shadow-xl backdrop-blur-xl">
						<div className="card-body">
							<button
								className="btn btn-outline btn-warning btn-sm"
								onClick={() => setRawOpen(!rawOpen)}>
								{rawOpen ? 'Hide Raw JSON' : 'Show Raw JSON'}
							</button>

							{rawOpen && (
								<div className="mt-4 max-h-80 overflow-auto text-sm">
									<pre className="rounded bg-black/40 p-4 text-neutral-300">
										{JSON.stringify(ipInfo, null, 2)}
									</pre>
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			<style jsx global>{`
				@keyframes fadeIn {
					from {
						opacity: 0;
						transform: translateY(10px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
				.animate-fadeIn {
					animation: fadeIn 0.8s ease forwards;
				}
			`}</style>
		</div>
	);
};

export default AppPage;
