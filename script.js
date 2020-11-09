const SpeechRecognition = webkitSpeechRecognition;

// Lyrics API
let artist = "beyonce";
let track = "irreplaceable";
let lyricsApiKey;
let artBearerToken;
let artURL = "";

// data handling
let rawData;
let lyrics;
let lyricsArray = [];
let displayQuestion = [];
let displayAnswer = "";
let question;
let score = 0;
let state = "";
let speechResult;

// DOM elements
let answerButton = document.querySelector("#answer-button");
let searchTermDOM = document.querySelector("#searchTerm");
let searchButton = document.querySelector("#search-button");

// get api key and token from prompt
let pLyricsApiKey = prompt("Please enter lyricsApiKey");
if (pLyricsApiKey != null) {
	lyricsApiKey = pLyricsApiKey;
}
let pArtBearerToken = prompt("Please enter artBearerToken");
if (pArtBearerToken != null) {
	artBearerToken = pArtBearerToken;
}

const getSpeech = () => {
	const recognition = new SpeechRecognition();
	recognition.lang = "en-US";
	recognition.start();
	// recognition.continuous = true;
	searchTermDOM.value = "";
	searchTermDOM.placeholder = "e.g. Love the way you lie by Eminem";
	recognition.interimResults = true;

	recognition.onstart = (event) => {
		console.log("on start");
		searchButton.firstChild.style = "color: #ff7070";
	}
	recognition.onresult = (event) => {
		speechResult = event.results[0][0].transcript;
		// console.log("speech result: " + speechResult);
		// console.log("confidence: " + event.results[0][0].confidence);
		document.querySelector("#speech-div").textContent = "You said: " + speechResult;
	};

	recognition.onend = () => {
		// searching for a new song
		if (state == "search") {
			// handling query search
			// ensure that the user is speaking in the right "grammar"
			if (speechResult.includes(" by ")) {
				temp = speechResult.split(" by ");
				// prepare track and artist for API call
				track = temp[0];
				artist = temp[1];
				if (track && artist) {
					document.querySelector("#question-div").innerHTML = "";
					getLyrics();
					getAlbumArt();
					answerButton.textContent = "Say to Answer";
					searchTermDOM.placeholder = "Click the Mic button to start searching";
				} else {
					searchTermDOM.value = "";
					searchTermDOM.placeholder = "Sorry! Lyrics not found, try again...";
				}
			} else {
				searchTermDOM.value = "";
				searchTermDOM.placeholder = "Sorry! Lyrics not found, try again...";
			}
		} else {
			// answering question
			// checking if what the user said is similar enough to be considered a correct
			// 0.85 seemed to work reasonably without being too strict
			if (similarity(question, clean(speechResult)) > 0.85) {
				// console.log("correct");
				answerButton.textContent = "";
				let correctIcon = document.createElement('i');
				correctIcon.className = "fa fa-check-circle";
				correctIcon.id = "check-icon";
				answerButton.appendChild(correctIcon);
				// displaying the missing line back
				let child = document.querySelector("#question-div").childNodes;
				child[2].textContent = `"${displayAnswer}"`;
			} else {
				// console.log("wrong");
				answerButton.textContent = "";
				let wrongIcon = document.createElement('i');
				wrongIcon.className = "fa fa-times-circle";
				wrongIcon.id = "check-icon";
				answerButton.appendChild(wrongIcon);
			}
		}
		console.log("voice recognition over");
		recognition.stop();
		searchButton.firstChild.style = "color: white";
	};

	recognition.onerror = (event) => {
		console.log("something went wrong: " + event.error);
	};
};

let getLyrics = async () => {
	// templating string, and Api key is not written in the URL
	fetch(`https://orion.apiseeds.com/api/music/lyric/${artist}/${track}?apikey=${lyricsApiKey}`, {
		mode: "cors"
	}).
	then(response => response.json()).
	then(data => {
		// data massaging starts
		rawData = data;
		// assign the lyrics text to be a string
		lyrics = rawData.result.track.text;
		// split the string into lines of lyrics in an array
		lyricsArray = lyrics.split(/[\r\n]+/);
		// console.log("Lyrics Array:" lyricsArray);
		
		// generate a random integer to decide what the scope of lyrics should be
		let randomIndex = getRandomInt(lyricsArray.length - 4);
		// console.log("random index: ", randomIndex);
		for (i = 0; i < 4; i++) {
			// offseting the lyrics array
			displayQuestion[i] = lyricsArray[randomIndex + i];
		}
		// the actual hidden line is the 3rd line of the 4 lines
		displayAnswer = displayQuestion[2];
		question = displayQuestion[2];
		// removing special characters and convert to lower case, as question is used to check against the voice input
		question = clean(question);
		console.log("correct answer is: ", question);
		let temp = displayQuestion[2];
		// display the hidden line with underscores
		displayQuestion[2] = temp.replace(/[a-zA-Z0-9]/g, '_');
		// dynamically displaying all the lines
		for (i = 0; i < displayQuestion.length; i++) {
			let newElement = document.createElement('div');
			newElement.textContent = displayQuestion[i];
			newElement.style = "padding: 0.5vh";
			// special style treatment for the hidden line
			if (i == 2) {
				newElement.id = "correct-answer";
			}
			document.querySelector("#question-div").appendChild(newElement);
		}
		// show the hidden button
		answerButton.style = "display: inline";
		searchTermDOM.value = "";
	}).catch(error => {
		console.log(error);
		searchTermDOM.value = "";
		searchTermDOM.placeholder = "Sorry! Lyrics not found, try again...";
	});
}

let getAlbumArt = async () => {
	// setting up the header, referencing the code from `Postman`
	var myHeaders = new Headers();
	myHeaders.append("Content-Type", "application/json");
	// for oauth2 authorization
	myHeaders.append("Authorization", `Bearer ${artBearerToken}`);
	// myHeaders.append("Cookie", "__cfduid=d497947cf15db73df992723e38c1f74b41604739448");
	myHeaders.append("Mode", "cors");

	var requestOptions = {
		method: 'GET',
		headers: myHeaders,
		redirect: 'follow'
	};

	fetch(`https://cors-anywhere.herokuapp.com/https://api.genius.com/search?q=${track}`, requestOptions)
		.then(response => response.json())
		.then(result => {
			console.log(result);
			artURL = result.response.hits[0].result.song_art_image_url;
			console.log(artURL);
			document.querySelector("#art").src = artURL;
		})
		.catch(error => console.log('error', error));
}

// Button and Input Handler
searchButton.onclick = () => {
	state = "search";
	console.log("clicked search");
	// support a type in search besides a voice search
	let query = searchTermDOM.value;
	if (query) {
		temp = query.split(" by ");
		track = temp[0];
		artist = temp[1];
		if (track && artist) {
			document.querySelector("#question-div").innerHTML = "";
			getLyrics();
			getAlbumArt();
			state = "answering";
		} else {
			console.log("error");
			searchTermDOM.value = "";
			searchTermDOM.placeholder = "Sorry! Lyrics not found, try again...";
		}
	} else {
		getSpeech();
	}
}

searchTermDOM.oninput = () => {
	// change search button look dynamically
	if (searchTermDOM.value) {
		searchButton.firstChild.className = "fa fa-search";
	} else {
		searchButton.firstChild.className = "fa fa-microphone";
	}
}

answerButton.onclick = () => {
	console.log("clicked answer");
	state = "answering";
	answerButton.textContent = "listening...";
	getSpeech();
};

// helper functions
let clean = (s) => {
	// remove almost all special characters
	s = s.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()“”?]/g, "");
	s = s.toLowerCase();
	return s;
}
let getRandomInt = (max) => {
	return Math.floor(Math.random() * Math.floor(max));
}

// similarity of two strings in percentage
// https://stackoverflow.com/questions/10473745/compare-strings-javascript-return-of-likely
function similarity(s1, s2) {
	var longer = s1;
	var shorter = s2;
	if (s1.length < s2.length) {
		longer = s2;
		shorter = s1;
	}
	var longerLength = longer.length;
	if (longerLength == 0) {
		return 1.0;
	}
	return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
	s1 = s1.toLowerCase();
	s2 = s2.toLowerCase();

	var costs = new Array();
	for (var i = 0; i <= s1.length; i++) {
		var lastValue = i;
		for (var j = 0; j <= s2.length; j++) {
			if (i == 0)
				costs[j] = j;
			else {
				if (j > 0) {
					var newValue = costs[j - 1];
					if (s1.charAt(i - 1) != s2.charAt(j - 1))
						newValue = Math.min(Math.min(newValue, lastValue),
							costs[j]) + 1;
					costs[j - 1] = lastValue;
					lastValue = newValue;
				}
			}
		}
		if (i > 0)
			costs[s2.length] = lastValue;
	}
	return costs[s2.length];
}