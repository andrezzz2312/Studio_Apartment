'use strict'

/* __V3D_TEMPLATE__ - template-based file; delete this line to prevent this file from being updated */

window.addEventListener('load', function () {
	var CONTAINER_ID = 'v3d-container'

	;(function () {
		var params = v3d.AppUtils.getPageParams()

		var PUZZLES_DIR = '/puzzles/'
		var logicURL = params.logic
			? params.logic
			: '__LOGIC__visual_logic.js'.replace('__LOGIC__', '')
		var sceneURL = params.load
			? params.load
			: '__URL__studio_apartment.gltf'.replace('__URL__', '')
		if (!sceneURL) {
			console.log('No scene URL specified')
			return
		}

		// some puzzles can benefit from cache
		v3d.Cache.enabled = true

		if (v3d.AppUtils.isXML(logicURL)) {
			var logicURLJS = logicURL.match(/(.*)\.xml$/)[1] + '.js'
			new v3d.PuzzlesLoader().loadEditorWithLogic(
				PUZZLES_DIR,
				logicURLJS,
				function () {
					var initOptions = v3d.PL
						? v3d.PL.execInitPuzzles({
								container: CONTAINER_ID,
						  }).initOptions
						: { useFullscreen: true }
					var appInstance = loadScene(sceneURL, initOptions)
					v3d.PE.viewportUseAppInstance(appInstance)
				}
			)
		} else if (v3d.AppUtils.isJS(logicURL)) {
			new v3d.PuzzlesLoader().loadLogic(logicURL, function () {
				var initOptions = v3d.PL
					? v3d.PL.execInitPuzzles({
							container: CONTAINER_ID,
					  }).initOptions
					: { useFullscreen: true }
				loadScene(sceneURL, initOptions)
			})
		} else {
			loadScene(sceneURL, { useFullscreen: true })
		}
	})()

	function loadScene(sceneURL, initOptions) {
		initOptions = initOptions || {}

		var ctxSettings = {}
		if (initOptions.useBkgTransp) ctxSettings.alpha = true
		if (initOptions.preserveDrawBuf) ctxSettings.preserveDrawingBuffer = true

		var preloader = initOptions.useCustomPreloader
			? createCustomPreloader(
					initOptions.preloaderProgressCb,
					initOptions.preloaderEndCb
			  )
			: new v3d.SimplePreloader({ container: CONTAINER_ID })

		if (v3d.PE) {
			puzzlesEditorPreparePreloader(preloader)
		}

		var app = new v3d.App(CONTAINER_ID, ctxSettings, preloader)
		if (initOptions.useBkgTransp) {
			app.clearBkgOnLoad = true
			app.renderer.setClearColor(0x000000, 0)
		}

		// namespace for communicating with code generated by Puzzles
		app.ExternalInterface = {}
		prepareExternalInterface(app)

		if (initOptions.preloaderStartCb) initOptions.preloaderStartCb()
		if (initOptions.useFullscreen) {
			initFullScreen()
		} else {
			var fsButton = document.getElementById('fullscreen_button')
			if (fsButton) fsButton.style.display = 'none'
		}

		sceneURL = initOptions.useCompAssets ? sceneURL + '.xz' : sceneURL
		app.loadScene(
			sceneURL,
			function () {
				app.enableControls()
				app.run()

				if (v3d.PE) v3d.PE.updateAppInstance(app)
				if (v3d.PL) v3d.PL.init(app, initOptions)

				runCode(app)
				console.log('listo')
				const welcome = document.querySelector('.welcome')
				welcome.classList.add('appear')
				const main = document.querySelector('.contenedor_personalizar')
				main.style.display = 'flex'
			},
			null,
			function () {
				console.log("Can't load the scene " + sceneURL)
			}
		)

		return app
	}

	function createCustomPreloader(updateCb, finishCb) {
		function CustomPreloader() {
			v3d.Preloader.call(this)
		}

		CustomPreloader.prototype = Object.assign(
			Object.create(v3d.Preloader.prototype),
			{
				onUpdate: function (percentage) {
					v3d.Preloader.prototype.onUpdate.call(this, percentage)
					if (updateCb) updateCb(percentage)
				},
				onFinish: function () {
					v3d.Preloader.prototype.onFinish.call(this)
					if (finishCb) finishCb()
				},
			}
		)

		return new CustomPreloader()
	}

	/**
	 * Modify the app's preloader to track the loading process in the Puzzles Editor.
	 */
	function puzzlesEditorPreparePreloader(preloader) {
		// backward compatibility for loading new projects within the old Puzzles Editor
		if (
			v3d.PE.loadingUpdateCb !== undefined &&
			v3d.PE.loadingFinishCb !== undefined
		) {
			var _onUpdate = preloader.onUpdate.bind(preloader)
			preloader.onUpdate = function (percentage) {
				_onUpdate(percentage)
				v3d.PE.loadingUpdateCb(percentage)
			}

			var _onFinish = preloader.onFinish.bind(preloader)
			preloader.onFinish = function () {
				_onFinish()
				v3d.PE.loadingFinishCb()
			}
		}
	}

	function initFullScreen() {
		var fsButton = document.getElementById('fullscreen_button')
		if (!fsButton) return

		var container = document.getElementById(CONTAINER_ID)

		if (
			document.fullscreenEnabled ||
			document.webkitFullscreenEnabled ||
			document.mozFullScreenEnabled ||
			document.msFullscreenEnabled
		)
			fsButton.style.display = 'inline'

		fsButton.addEventListener('click', function (event) {
			event.stopPropagation()
			if (
				document.fullscreenElement ||
				document.webkitFullscreenElement ||
				document.mozFullScreenElement ||
				document.msFullscreenElement
			) {
				exitFullscreen()
			} else requestFullscreen(container)
		})

		function changeFullscreen() {
			if (
				document.fullscreenElement ||
				document.webkitFullscreenElement ||
				document.mozFullScreenElement ||
				document.msFullscreenElement
			) {
				fsButton.classList.remove('fullscreen-open')
				fsButton.classList.add('fullscreen-close')
			} else {
				fsButton.classList.remove('fullscreen-close')
				fsButton.classList.add('fullscreen-open')
			}
		}

		document.addEventListener('webkitfullscreenchange', changeFullscreen)
		document.addEventListener('mozfullscreenchange', changeFullscreen)
		document.addEventListener('msfullscreenchange', changeFullscreen)
		document.addEventListener('fullscreenchange', changeFullscreen)

		function requestFullscreen(elem) {
			if (elem.requestFullscreen) elem.requestFullscreen()
			else if (elem.mozRequestFullScreen) elem.mozRequestFullScreen()
			else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen()
			else if (elem.msRequestFullscreen) elem.msRequestFullscreen()
		}

		function exitFullscreen() {
			if (document.exitFullscreen) document.exitFullscreen()
			else if (document.mozCancelFullScreen) document.mozCancelFullScreen()
			else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
			else if (document.msExitFullscreen) document.msExitFullscreen()
		}
	}

	///////////////       ///////////////////////       ////////////////        /////////////////
	const info = document.querySelector('.info')
	const label = document.querySelector('.label')
	const line = document.querySelector('.line')
	const subLabel = document.querySelector('.subLabel')
	let showCheck = false

	function vanishTitle() {
		info.classList.remove('show')
		line.classList.remove('lineWidth')
		label.classList.remove('fade')
		subLabel.classList.remove('fade')
	}

	function showTitle() {
		console.log(showCheck)
		if (showCheck === false) {
			showCheck = true
			setTimeout(() => {
				info.classList.add('show')
				line.classList.add('lineWidth')
				setTimeout(() => {
					label.classList.add('fade')
					setTimeout(() => {
						subLabel.classList.add('fade')
						showCheck = false
					}, 500)
				}, 500)
			}, 1750)
		}
	}

	function changeTitle(labelText, subLabelText) {
		const label = document.querySelector('.label')
		const subLabel = document.querySelector('.subLabel')

		label.textContent = labelText
		subLabel.textContent = subLabelText
	}

	function detectDevice() {
		if (
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
				navigator.userAgent
			)
		) {
			return 'movil'
		} else {
			return 'pc'
		}
	}

	function prepareExternalInterface(app) {
		app.ExternalInterface.showTitle = showTitle
		app.ExternalInterface.vanishTitle = vanishTitle
		app.ExternalInterface.changeTitle = changeTitle
		app.ExternalInterface.detectDevice = detectDevice
	}

	function runCode(app) {
		const contenerdorP = document.querySelector('.contenedor_personalizar')
		const arrow = document.querySelector('#arrow')
		const okay = document.querySelector('.okayBtn')
		const welcome = document.querySelector('.welcome')
		const welcomeContainer = document.querySelector('.welcomeContainer')
		const controls = document.querySelector('.controls')
		const customize = document.querySelector('.contenedor_personalizar')
		const wasd = document.querySelector('.wasd')

		const pointDiv = document.querySelector('#pointDiv')
		const pointerDiv = document.querySelector('#pointerDiv')
		const rightC = document.querySelector('.rightC')
		let check = false

		okay.addEventListener('click', function () {
			welcomeContainer.style.pointerEvents = 'none'
			if (
				/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
					navigator.userAgent
				)
			) {
				controls.classList.add('showUI')
				wasd.style.display = 'none'

				rightC.style.display = 'none'
				pointDiv.style.display = 'flex'
				pointerDiv.style.display = 'flex'
			} else {
				controls.classList.add('showUI')
			}
			setTimeout(() => {
				controls.classList.remove('showUI')
			}, 15000)
			welcome.classList.add('vanish')
			okay.style.pointerEvents = 'none'
			customize.classList.add('showUI')

			document.addEventListener('keydown', keyDownTextField, false)

			function keyDownTextField(e) {
				var keyCode = e.keyCode
				if (keyCode == 'w' || 'a' || 's' || 'd') {
					setTimeout(() => {
						controls.classList.remove('showUI')
					}, 5000)
				}
			}
		})
		arrow.addEventListener('click', function () {
			if (!check) {
				check = true
				contenerdorP.style.maxHeight = '100%'
			} else {
				check = false
				contenerdorP.style.maxHeight = '2rem'
			}
		})
	}
})
