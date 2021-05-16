import path from 'path'
import spawnAsync from '@expo/spawn-async'
import chokidar from 'chokidar'
import PQueue from 'p-queue'

async function move(queue, src, outDir, dry) {
	console.log(`Queued move: ${src} to ${outDir}`)
	return queue.add(async () => {
		try {
			const srcName = path.basename(src)
			const tempName = `.${srcName}.mvtmp`
			const tempPath = path.join(outDir, tempName)
			const outPath = path.join(outDir, srcName)
			console.log(`Moving (1/2): ${src} to ${tempPath}`)
			if (!dry) {
				await spawnAsync('mv', [src, tempPath])
			}
			console.log(`Moving (2/2): ${tempName} to ${srcName}`)
			if (!dry) {
				await spawnAsync('mv', [tempPath, outPath])
			}
		} catch (e) {
			console.error(e)
		}
	})
}

async function main() {
	const [inGlob, outDir, dry] = process.argv.slice(2)
	if (!inGlob || !outDir) {
		console.error(`Usage: ${process.argv[1]} inGlob outDir [dry]`)
		return
	}

	// Create queue
	const queue = new PQueue({ concurrency: 1 })

	// Watch for new files to move
	chokidar.watch(inGlob).on('add', path => {
		move(queue, path, outDir, dry)
	})
}

main()
	.then(() => {})
	.catch(error => {
		console.error(error)
	})
