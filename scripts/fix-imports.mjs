import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const distDir = './dist';

async function fixImports(dir) {
	const entries = await readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = join(dir, entry.name);

		if (entry.isDirectory()) {
			await fixImports(fullPath);
		} else if (entry.name.endsWith('.js')) {
			let content = await readFile(fullPath, 'utf8');

			// Fix relative imports to add .js extension
			content = content.replace(
				/(from\s+['"])(\.\.?\/[^'"]+)(?<!\.js)(['"])/g,
				'$1$2.js$3'
			);

			// Fix dynamic imports
			content = content.replace(
				/(import\s*\(\s*['"])(\.\.?\/[^'"]+)(?<!\.js)(['"]\s*\))/g,
				'$1$2.js$3'
			);

			await writeFile(fullPath, content);
		}
	}
}

console.log('Fixing imports in dist...');
await fixImports(distDir);
console.log('Done!');
