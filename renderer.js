// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

;(function () {
  const fs = require('fs')
  const { dialog } = require('electron').remote
  const $ = document.querySelector.bind(document)
  const $$ = document.querySelectorAll.bind(document)

  const $uploadForm = $('#uploadForm')
  const $editForm = $('#editForm')
  const $currentTime = $('#currentTime')
  const audio = $('#myAudio')
  let errorMessage = ''
  let lyricFromFile = []

  // event listeners
  $uploadForm.addEventListener('submit', submitData, false)
  $('#backBtn').addEventListener('click', backToInit, false)
  $('#saveBtn').addEventListener('click', savefile, false)
  $('#resetAudioBtn').addEventListener('click', resetAudio, false)
  $('#upload-select').addEventListener('change', showChoice, false)

  $('#song').addEventListener('change', function () {
    audio.src = this.files[0].path
  })
  $('#lrcFile').addEventListener('change', function () {
    const lrcfilePath = this.files[0].path
    lyricFromFile = readfile(lrcfilePath)
  })

  audio.addEventListener('timeupdate', function () {
    $currentTime.innerHTML = formatTime(audio.currentTime)
    onPreview()
  })

  // functions
  function submitData (e) {
    e.preventDefault()
    validateLyrics();
    if(errorMessage !== ''){
      return false;
    }
    printEditForm(get_lyrics())
    addClickToBtns()
    goToEditPage()
  }

  function addClickToBtns(){
    $$('.enterTimeBtn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        this.nextSibling.value = $currentTime.innerHTML
      })
    })
    $$('.jumpTimeBtn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const timeStr = this.nextSibling.nextSibling.value
        audio.currentTime = convertTime(timeStr)
      })
    })
  }

  function goToEditPage(){
    $uploadForm.style.display = 'none'
    $editForm.style.display = 'block'
  }

  function validateLyrics() {
    const val = $('#upload-select').value;
    if(val === 'paste' && $('#lyrics').value === '' || val === 'edit' && $('#lrcFile').files.length == 0){
      errorMessage = 'Please upload your lyrics.'
      $('#error').innerHTML = errorMessage;
    }else{
      errorMessage = ''
      $('#error').innerHTML = ''
    }
  }

  function showChoice() {
    const val = $('#upload-select').value;
    if(val === 'paste'){
      showPasteLyricsOption()
    }
    if(val === 'edit'){
      showUploadFileOption()
    }
  }

  function showPasteLyricsOption(){
    $('.paste-lyrics').style.display = 'block';
    $('.upload-file').style.display = 'none';
  }

  function showUploadFileOption(){
    $('.paste-lyrics').style.display = 'none';
    $('.upload-file').style.display = 'block';
  }

  function get_lyrics() {
    let lyric_arr = []
    const val = $('#upload-select').value;
    if(val === 'paste'){
      lyric_arr = lyricFromPaste()
    }
    if(val === 'edit'){
      lyric_arr = lyricFromFile
    }
    return lyric_arr
  }

  function goToStartPage(){
    $uploadForm.style.display = 'block'
    $editForm.style.display = 'none'
  }

  function backToInit () {
    goToStartPage()
    resetAudio ()
  }

  function lyricFromPaste () {
    const lyric_lines = $('#lyrics').value.split('\n')
    let lyricArr = []
    lyric_lines.forEach(function (line) {
      let item = ['00:00.00']
      item.push(line)
      lyricArr.push(item)
    })
    return lyricArr
  }

  function serializeInputs () {
    let lrc = ''
    const inputs = $editForm.querySelectorAll('input')
    inputs.forEach(function (input) {
      const timeInput = /\d/.test(input.value) && input.value.indexOf(':') > 1
      lrc += timeInput ? '\n' + '[' + input.value + ']' : input.value
    })
    return lrc
  }

  function onPreview () {
    let targetElement = {
      value: '00:00.00',
      nextSibling: { style: { color: 'black' } }
    }
    $$('.timeInput').forEach(function (input) {
      input.nextSibling.style.color = 'black'
      const time = convertTime(input.value)
      if (
        time <= audio.currentTime &&
        time > convertTime(targetElement.value)
      ) {
        targetElement = input
      }
    })
    targetElement.nextSibling.style.color = 'white'
  }

  function resetAudio () {
    if (!audio.paused) {
      audio.pause()
    }
    audio.currentTime = 0
  }

  function printEditForm (lyricsArr) {
    let lrc = '<div class="lrc-row">'
    lyricsArr.forEach(function (item) {
      lrc += '<button type="button" class="jumpTimeBtn">JUMP</button>'
      lrc += '<button type="button" class="enterTimeBtn">INSERT</button>'
      lrc +=
        '<input class="timeInput input-style" style="font-size:16px;" type="text" size="15" value="' +
        item[0] +
        '">'
      lrc +=
        '<input class="input-style" style="font-size:16px;" type="text" size="50" value="' +
        item[1] +
        '"><br>'
    })
    lrc += '</div>'
    $('#lrc').innerHTML = lrc
  }

  function formatTime (ms) {
    const timeStr = ms.toFixed(2).toString()
    const milis = timeStr.substring(timeStr.indexOf('.') + 1)
    const mins = Math.floor(ms / 60)
    const seconds = Math.floor(ms - mins * 60)
    return (
      (mins < 10 ? '0' : '') +
      mins +
      ':' +
      (seconds < 10 ? '0' : '') +
      seconds +
      '.' +
      milis
    )
  }

  function convertTime (timeStr) {
    const splitCol = timeStr.split(':')
    const mins = splitCol[0]
    const splitDot = splitCol[1].split('.')
    const secs = splitDot[0]
    const milis = splitDot[1]
    return +mins * 60 + +secs + +milis / 100
  }

  function savefile () {
    dialog.showSaveDialog(function (filePath) {
      if (filePath === undefined) {
        return
      }
      fs.writeFile(filePath, serializeInputs(), function (err) {
        if (!err) {
          dialog.showMessageBox({
            message: 'The file has been saved!',
            buttons: ['OK']
          })
        } else {
          dialog.showErrorBox('File save error', err.message)
        }
      })
    })
  }

  function readfile (path) {
    try {
      const fileStr = fs.readFileSync(path, 'utf-8')
      const fileLines = fileStr.split('\n')
      let lyrics = []
      fileLines.forEach(function (line) {
        let lineArr = []
        const hasBrackets = line.match(/\[(.*?)\]/)
        lineArr[0] = hasBrackets && validateTimeField(hasBrackets[1]) ? hasBrackets[1] : '00:00.00'
        lineArr[1] = line.substr(line.indexOf(']') + 1)
        lyrics.push(lineArr)
      })
      return lyrics
    } catch (err) {
      dialog.showErrorBox('Error reading the file')
    }
  }

  function validateTimeField(str){
    if(str.length !== 8 || str[2] !== ':' || str[5] !== '.'){
      return false
    }
    const numStr = str.replace(/[:.]/g, '');
    if(isNaN(numStr)){
      return false
    }
    return true
  }

})() // end closure
