#!/usr/bin/env node
import path from 'path'
import fs from 'fs'
import chokidar from 'chokidar'
import PQueue from 'p-queue'
import checkDiskSpace from 'check-disk-space'
const { stat, copyFile, unlink, rename } = fs.promises

// Set to true to skip actual moves
// TODO: Use environment variable
const DRY = false

// Find output directory with enough free space for src file
// Throws if all are full
async function getFreeDir(src, outDirs) {
	const { size } = await stat(src)
	for (const dir of outDirs) {
		// Check if file will fit in output directory
		const dirPath = path.resolve(dir)
		const { free } = await checkDiskSpace(dirPath)
		if (size < free) {
			return dirPath
		}
	}
	throw new Error('All specified output directories are full.')
}

async function move(src, outDirs) {
	try {
		// Get paths/filenames
		const outDir = await getFreeDir(src, outDirs)
		const srcName = path.basename(src)
		const tempName = `${srcName}.mvtmp`
		const tempPath = path.join(outDir, tempName)
		const outPath = path.join(outDir, srcName)
		// Atomic move (copy to temp, rename temp to final, delete original)
		console.log(`Moving: ${src} to ${outPath}`)
		if (DRY) {
			console.log(`Dry run, skipped. (${srcName})`)
			return
		}
		await copyFile(src, tempPath)
		await rename(tempPath, outPath)
		await unlink(src)
		console.log(`Done! (${srcName})`)
	} catch (e) {
		console.error(e)
	}
}

async function main() {
	const [inGlob, ...outDirs] = process.argv.slice(2)
	if (!inGlob || outDirs.length === 0) {
		console.error(`Usage: ${process.argv[1]} inGlob <...outDirs>`)
		return
	}

	// Create queue
	const queue = new PQueue({ concurrency: 1 })

	// Watch for new files to move
	chokidar.watch(inGlob).on('add', src => {
		console.log(`Queued move: ${src}`)
		queue.add(() => move(src, outDirs))
	})
}

main()
	.then(() => {})
	.catch(error => {
		console.error(error)
	})
