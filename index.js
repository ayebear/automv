#!/usr/bin/env node
import path from 'path'
import fs from 'fs'
import chokidar from 'chokidar'
import PQueue from 'p-queue'
import spawnAsync from '@expo/spawn-async'
const { stat, readFile } = fs.promises

// Given an array of directories, return an array of integers
// of free bytes for each directory.
async function getFreeBytes(host, user, dirs) {
	const { stdout } = await spawnAsync('ssh', [
		`${user}@${host}`,
		'df',
		'--output=avail',
		'-B',
		'1',
		...dirs,
	])
	// Parse df command output, match with input
	return stdout
		.split('\n')
		.slice(1, 1 + dirs.length)
		.map(str => parseInt(str, 10))
}

// Find output directory with most free space, that also fits src file
// Throws if all are full
async function getFreeDir(config, src) {
	const { size } = await stat(src)
	const freeBytes = await getFreeBytes(
		config.host,
		config.user,
		config.destDirsResolved
	)
	const maxIndex = freeBytes.reduce(
		(a, c, i) => (c > freeBytes[a] ? i : a),
		0
	)
	// Check if file will fit in output directory
	const freeDir = config.destDirsResolved[maxIndex]
	if (freeDir && size < freeBytes[maxIndex]) {
		return freeDir
	}
	throw new Error('No specified output directory fits source file.')
}

// Escape spaces in strings
function esc(str) {
	return str.trim().replace(/([ /])/g, '\\$1')
}

async function move(config, src) {
	try {
		// Get paths/filenames
		const { user, host, dry } = config
		const outDir = await getFreeDir(config, src)
		const srcName = path.basename(src)
		const outPath = path.join(outDir, srcName)
		// Atomic move (copy to temp, rename temp to final, delete original)
		console.log(`Moving: ${src} to ${outPath}`)
		await spawnAsync(
			'rsync',
			[
				'-avP',
				'--remove-source-files',
				...(dry ? ['--dry-run'] : []),
				src,
				`${user}@${host}:${esc(outPath)}`,
			],
			{ stdio: 'inherit' }
		)
		console.log(`Done! (${srcName})`)
	} catch (e) {
		console.error(e)
	}
}

async function main() {
	const [configPath] = process.argv.slice(2)
	if (!configPath) {
		console.error(`Usage: ${process.argv[1]} config.json`)
		return
	}
	// Read config file
	const config = JSON.parse(await readFile(configPath))
	config.destDirsResolved = config.destDirs.map(dir => path.resolve(dir))
	console.log('Processed config:', config)

	// Create queue
	const queue = new PQueue({ concurrency: 1 })

	// Watch for new files to move
	chokidar.watch(config.sourceGlob).on('add', src => {
		console.log(`Queued move: ${src}`)
		queue.add(() => move(config, src))
	})
}

main()
	.then(() => {})
	.catch(error => {
		console.error(error)
	})
