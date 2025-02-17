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

function Resource(props) {
	return (
		<a href={props.href} target="_blank" class="resource">
			<h2>{props.title}</h2>
			<p>{props.description}</p>
		</a>
	);
}

if (typeof window !== 'undefined') {
	hydrate(<App />, document.getElementById('app'));
	initStrudel();
}

export async function prerender(data) {
	return await ssr(<App {...data} />);
}
