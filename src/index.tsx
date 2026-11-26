import { hydrate, prerender as ssr } from 'preact-iso';
import { initStrudel } from '@strudel/web';

import './style.css';
import BoleroApp from './bolero'; 

export function App() {
	return (
		<div>
			<BoleroApp />
		</div>
	);
}

function Resource(props: { href: string; title: string; description: string }) {
	return (
		<a href={props.href} target="_blank" class="resource">
			<h2>{props.title}</h2>
			<p>{props.description}</p>
		</a>
	);
}

if (typeof window !== 'undefined') {
	const app = document.getElementById('app');
	if (app) {
		hydrate(<App />, app);
	}
	initStrudel();
}

export async function prerender(data: Record<string, unknown>) {
	return await ssr(<App {...data} />);
}
