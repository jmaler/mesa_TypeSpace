// Mesa SDK is loaded via script tag in index.html

// Music reference at module scope for control during restart
let music = null;

// DOM refs (initialized in startGame)
let canvas = null;
let c = null;
let gameOverScreen = null;
let finalScoreElement = null;
let playAgainBtn = null;
let startScreen = null;
let startBtn = null;
let mobileInput = null;

// Mobile detection
const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Game state
let gameOver = false; // loops game if gameOver = false
let scoreSubmitted = false; // track if score has been submitted to prevent duplicate submissions
let velocity = 1;
let lifeFrequency = 0;
let keyListenerAdded = false; // prevent duplicate keyboard listeners
let mobileInputSetup = false; // prevent duplicate mobile input listeners

// Game objects (initialized in initGameObjects)
let input = null;
let score = null;
let player = null;
let actors = null;
let life = null;

function ensureMusicPlaying() {
    if (!music) {
        console.warn('[Audio] Music object not initialized');
        return;
    }
    if (!music.paused) return;
    
    // Autoplay can be blocked by browser/iframe policies; retrying on user input
    music.play()
        .then(() => {
            console.log('[Audio] Music playback started successfully');
        })
        .catch((err) => {
            // Expected in iframes with restrictive Feature Policy
            console.warn('[Audio] Autoplay blocked (normal in embedded games):', err.message || err.name);
        });
}










//*******************IMPORTANT*****************************/
// SINCE THE FIREBASE DATBASE ISN'T HOSTED ANYMORE, WE WILL HARDCODE A FEW WORDS IN A LIST.

const words = [
    'APPLE', 'BANANA', 'CARROT', 'DAISY', 'ELEPHANT', 'FROG',
    'GRAPE', 'HAPPY', 'IGLOO', 'JUMP', 'KITE', 'LEMON',
    'MONKEY', 'NEST', 'ORANGE', 'PURPLE', 'QUICK', 'RABBIT',
    'SUN', 'TURTLE', 'MOUSE',
    'RED', 'BLUE', 'CAT', 'DOG', 'FISH',
    'GARDEN', 'ROCKET', 'SCHOOL', 'SUMMER', 'WINTER',
    'FRIEND', 'FLOWER', 'YELLOW', 'BUTTERFLY', 'DOLPHIN',
    'MOUNTAIN', 'ADVENTURE', 'UNIVERSE', 'ASTRONAUT', 'RAINBOW'
  ];










// Initialize Mesa SDK (optional - game works without it)
async function initMesaSDK() {
    try {
        if (window.Mesa) {
            await window.Mesa.init();
            console.log('Mesa SDK initialized');
        } else {
            console.log('Mesa SDK not available - running in standalone mode');
        }
    } catch (e) {
        console.warn('Mesa SDK init failed:', e);
    }
}

function initDomRefs() {
    canvas = document.getElementById("canV");
    if (!canvas) {
        throw new Error('Canvas element #canV not found');
    }
    c = canvas.getContext("2d");
    if (!c) {
        throw new Error('2D canvas context not available');
    }

    gameOverScreen = document.getElementById('gameOverScreen');
    finalScoreElement = document.getElementById('finalScore');
    playAgainBtn = document.getElementById('playAgainBtn');
    startScreen = document.getElementById('startScreen');
    startBtn = document.getElementById('startBtn');
    mobileInput = document.getElementById('mobileInput');

    // Sets canvas dimensions
    canvas.width = 1920; // window.innerWidth
    canvas.height = 1080; // window.innerHeight

    // Specifies canvas' font attributes.
    c.textAlign = "left";
    c.fillStyle = "white";

    // Bind UI
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', resetGame);
    }
}

function initGameObjects() {
    // Initialize input + one-time key listener
    input = new Input();
    input.checkForInput();

    // Initialize game objects
    score = new Score();
    player = new Player();
    actors = new Actors();
    life = new Life();

    // Reset state vars
    gameOver = false;
    scoreSubmitted = false;
    velocity = 1;
    lifeFrequency = 0;
}

// Start the game when page loads - shows start screen
function startGame() {
    console.log('[TypeSpace] === GAME STARTUP ===');
    console.log('[TypeSpace] Environment:', {
        inIframe: window.parent !== window,
        mesaSDKAvailable: !!window.Mesa,
        isMobile: isMobile,
        userAgent: navigator.userAgent.substring(0, 50) + '...'
    });

    try {
        initDomRefs();
        console.log('[TypeSpace] DOM refs initialized:', {
            canvas: !!canvas,
            gameOverScreen: !!gameOverScreen,
            finalScoreElement: !!finalScoreElement,
            playAgainBtn: !!playAgainBtn,
            startScreen: !!startScreen,
            startBtn: !!startBtn,
            mobileInput: !!mobileInput
        });
    } catch (e) {
        console.error('[TypeSpace] FATAL: DOM initialization failed:', e);
        return; // Cannot proceed without DOM
    }

    // Initialize Mesa SDK (don't wait for it)
    initMesaSDK();

    console.log('[TypeSpace] Game loaded (v1.4.0 - Start Screen & Mobile Support)');

    // Set up start button click handler
    if (startBtn) {
        startBtn.addEventListener('click', beginGame);
    }

    // Show start screen (it's visible by default via CSS)
    if (startScreen) {
        startScreen.style.display = 'flex';
    }
}

// Begin the actual game (called when Start button is clicked)
function beginGame() {
    console.log('[TypeSpace] === BEGINNING GAME ===');

    // Hide start screen
    if (startScreen) {
        startScreen.style.display = 'none';
    }

    try {
        initGameObjects();
        console.log('[TypeSpace] Game objects initialized');
    } catch (e) {
        console.error('[TypeSpace] FATAL: Game object initialization failed:', e);
        return;
    }

    // Play looped music with comprehensive error handling (user has interacted, so autoplay should work)
    try {
        music = new Audio('./material/audio/spaceRace.mp3');
        music.loop = true;
        music.volume = 0.5; // Start at 50% volume

        music.play()
            .then(() => console.log('[Audio] Background music started'))
            .catch((err) => {
                console.warn('[Audio] Autoplay blocked:', err.name);
            });
    } catch (e) {
        console.error('[Audio] Failed to create Audio object:', e);
        music = null; // Ensure game can continue without music
    }

    // Set up mobile input handling
    setupMobileInput();

    // Start the game loop
    update();
}

// Setup mobile keyboard input handling
function setupMobileInput() {
    if (!mobileInput) return;

    // Prevent adding duplicate listeners
    if (mobileInputSetup) return;
    mobileInputSetup = true;

    // Handle input from mobile keyboard
    mobileInput.addEventListener('input', function(e) {
        if (gameOver) return;

        const value = mobileInput.value.toUpperCase();

        // Process each character typed
        if (value.length > 0) {
            const lastChar = value.charAt(value.length - 1);
            if (/[A-Z]/.test(lastChar)) {
                input.addLetter(lastChar);
            }
        }

        // Clear the input field
        mobileInput.value = '';
    });

    // Handle special keys on mobile (Enter key)
    mobileInput.addEventListener('keydown', function(e) {
        if (gameOver) return;

        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            input.checkWord();
        } else if (e.key === 'Backspace' || e.keyCode === 8) {
            e.preventDefault();
            input.deleteLetter();
        }
    });

    // Tap on canvas to focus the mobile input (shows keyboard)
    canvas.addEventListener('click', function() {
        if (gameOver) return;
        focusMobileInput();
    });

    canvas.addEventListener('touchstart', function(e) {
        if (gameOver) return;
        focusMobileInput();
    });

    // Auto-focus on mobile after game starts
    if (isMobile) {
        setTimeout(focusMobileInput, 100);
    }
}

// Focus the mobile input to show keyboard
function focusMobileInput() {
    if (mobileInput && !gameOver) {
        mobileInput.focus();
        // Ensure keyboard shows on some devices
        mobileInput.click();
    }
}





class Explosion {

    /*This class holds the all the attributes and methods necessary to display an explosion
    when a meteor is destroyed.*/

    constructor(xPosition, yPosition) {

        // Position of the explosion. They are the same as the meteor's position.

        this.x = xPosition
        this.y = yPosition

        // Size of explosion.

        this.width = 300
        this.height = 300

        // "frameCounter" attribute is used to measure how long a frame is displayed on screen.

        this.frameCounter = 0

        // "spriteSelection" attribute will choose which sprite frame will be displayed.

        this.spriteSelection = 1

        // The "sprites" attribute holds all the frames for the explosion animation.

    }

    loadImage() {

        // Load the explosion frame that will be used.

        const image = new Image()
        image.src = './material/explosion/' + parseInt(this.spriteSelection) + '.png'
        image.onload = () => {
            const scale = 0.1 + (Math.random() / 4)
            this.image = image
            this.width = this.width
            this.height = this.width
            this.x = this.x - 1
            this.y = this.y
        }
    }


    // This method draws the explosion on the screen.

    draw() {

        // Load frame.

        this.loadImage()

        // If frame exist, display frame on specified location.

        if (this.image) {
            c.drawImage(
                this.image,
                this.x,
                this.y,
                this.width,
                this.height)
        }
    }


    // When called in the game loop, this method will increse the frame counter by 1.

    increment_frame_counter() {

        if (this.frameCounter == 1) { //Every two frames, the counter is reset.
            this.frameCounter = 0
            this.spriteSelection += 1
        } else {
            this.frameCounter += 1
        }
    }
}




class Star{

    /* This class spawns handles each indiviual star that is in the background.
    */

    constructor(isStarter) {

        // The "speeder" variable chooses a random value, later to be used to randomize object velocity.

        this.speeder = (Math.floor(Math.random() * 3)) + 1

        // Loads image and sets size and position. 
        
        const image = new Image()
        image.src = './material/stars/star.png'
        image.onload = () => {
            const scale = 0.1 + (Math.random() / 4)
            this.image = image
            this.width = 20 * scale
            this.height = 20 * scale
            if (isStarter){
            this.x = Math.floor(Math.random() * 1920)
            }
            else {
                this.x = canvas.width - this.width
            }
            this.y = Math.floor(Math.random() * 1080)
        }   
    }


    // This method draws the star on the screen and updates its position.

    draw() {


        if (this.image) {
            this.x = this.x - (.5 * this.speeder);
            
            c.drawImage(
                this.image,
                this.x,
                this.y,
                this.width,
                this.height)
        }
    }
}





class Planet {

    // This class for the planets spawning in the background of the game.

    constructor(planetChoice) {

        this.velocity = .25 // Standard velocity.

        //load image

        const image = new Image()
        image.src = planetChoice
        image.onload = () => {
            this.image = image
            this.width = 400
            this.height = 400
            this.x = canvas.width - this.width + 500
            this.y = Math.floor(Math.random() * (900 - 100 + 1) + 100)
        }
    }

    //Draw image on screen.

    draw() {
        if (this.image) {
            this.x = this.x - this.velocity; // Update objects position.
            c.drawImage(
                this.image,
                this.x,
                this.y,
                this.width,
                this.height)
        }
    }
}




class Life {

    /* This class keeps track of the player's life, draws the player's life
    on the screen, and handles adding and removing life points.*/

    constructor() {
        this.life = 3 // set starting lives amount
        this.image = null;
        // Initialize position with defaults to prevent race condition
        this.position = { x: 10, y: 75 };
        this.width = 0;
        this.height = 0;
        this.loadImage()
    }

    // This method substracts a life point from the players current life.

    loseLife(player) {
        this.life -= 1
        player.frameCounter = -15
    }

    // This method adds a life point to the players current life.

    addLife() {
        if (this.life != 5)
            this.life += 1
        player.frameCounter = 15
        try {
            let healAudio = new Audio('./material/audio/heal.wav');
            healAudio.play().catch(() => {}); // May fail in iframe
        } catch (e) {
            // Audio not available - continue without sound
        }
    }

    // This method returns the amount of life points the player currently has.

    getLife() {
        return this.life;
    }

    // This medthod loads the picture representing the amount of life points the player currently has.

    loadImage() {
        const image = new Image()

        // Each of these image addresses loads a picture representing different heart (life points) quantities.

        if (this.life <= 0) {
            image.src = './material/life/life0.png'
        }
        else {
            image.src = './material/life/life' + parseInt(this.life) + '.png'
        }

        image.onload = () => {
            // Sets the life image's size and position.
            this.image = image
            this.width = image.width
            this.height = image.height
            this.position = {
                x: 10,
                y: 75
            }
        }
    }

    // This medthod draws on the screen how many life points the player currently has.

    draw() {
        this.loadImage()

        // Guard: don't draw if image hasn't loaded yet
        if (!this.image || !this.width || !this.height) return;

        c.drawImage(
            this.image,
            this.position.x,
            this.position.y,
            this.width,
            this.height)
    }
}


class Score {

    // The score class keeps track of the student's current score points, draws the scores on the screen, and increments the score each frame.

    constructor() {
        this.score = 1; // Player's score value
    }

    //This method returns the player's current score.

    getScore() {
        return this.score;
    }

    // This method increments the player score by .75 when called.

    increment() {
        this.score += .075
    }

    // This method displays the player's current score on the screen.

    draw() {
        c.font = +parseInt((50)) + 'px monospace';
        c.fillText('SCORE:' + parseInt(this.score), 15, 50)
    }
}


class Player {

    // The player class holds and sets the parameters and methods necessary to draw the ship on the screen.

    constructor() {

        this.frameCounter = 0
    }


    loadImage() {

        // Loads ship image.

        const image = new Image()

        if (this.frameCounter == 0) {
            image.src = './material/ship/spaceShip.png'
        }
        if (this.frameCounter > 0) {
            image.src = './material/ship/spaceShipHealed.png'
            this.frameCounter -= 1
        }
        if (this.frameCounter < 0) {
            image.src = './material/ship/spaceShipHurt.png'
            this.frameCounter += 1
        }

        image.onload = () => {

            // Sets image ship's size and position

            const scale = 0.25
            this.image = image
            this.width = 1280 * scale
            this.height = 720 * scale
            this.position = {
                x: 50,
                y: (canvas.height / 2) - (this.height) + 50
            }
        }
    }

    // This method draws the ship on the screen when called.

    draw() {
        this.loadImage()
        if (this.image)
            c.drawImage(
                this.image,
                this.position.x,
                this.position.y,
                this.width,
                this.height)
    }
}


class Meteor {

    /*The meteor class holds the attributes and methods necessary to 
    spawn and draw a meteor on the screen for the player to destroy. */

    constructor() {


        // Select a random word from the list of words.
        this.word = words[Math.floor(Math.random() * words.length)]

        // The "speeder" variable chooses a random value, later to be used to randomize object velocity.

        this.speeder = (Math.floor(Math.random() * 3)) + 1

        // This attribute chooses the frame of the meteor gif to be displayed.

        this.frame = 0;

        // Loads image and sets size and position. 
        
        const image = new Image()
        image.src = './material/Asteroid/frame' + parseInt(this.frame) + '.gif'
        image.onload = () => {
            const scale = 0.1 + (Math.random() / 4)
            this.image = image
            this.width = image.width * scale
            this.height = image.height * scale
            this.x = canvas.width - this.width + 500
            this.y = Math.floor(Math.random() * (900 - 100 + 1) + 100)
        }
    }

    // This function load the meteor frame that will be used.

    loadImage(){
        const image = new Image()
        image.src = './material/Asteroid/frame' + parseInt(0) + '.gif'

        this.frame += 1

        if (this.frame == 32){
            this.frame = 0;
        }

        image.onload = () => {
            const scale = 0.1 + (Math.random() / 4)
            this.image = image
            this.width = this.width
            this.height = this.height
            this.x = this.x
            this.y = this.y
        }


    }

    // This method draws the meteor on the screen and updates its position.

    draw() {

        this.loadImage()

        if (this.image) {
            this.x = this.x - (velocity * this.speeder);
            c.font = parseInt((50)) + 'px monospace';
            if (typeof this.image == undefined) {
                console.log('Hey man your image is undefined again.')
            }
            c.drawImage(
                this.image,
                this.x,
                this.y,
                this.width,
                this.height)
            c.fillText(this.word, this.x, this.y + 100)
        }
    }

    getPosition() {
        return [this.x, this.y];
    }

}


class LifeBonus {

    /* This "LifeBonus" class handles the the attributes and methods 
    necessary for the extra lives to spawn, move across the screen, and disappear. */

    constructor() {

        // Select a random word from the list of words.
        this.word = words[Math.floor(Math.random() * words.length)]


        // The "speeder" variable chooses a random value, later to be used to randomize object velocity.

        this.speeder = (Math.floor(Math.random() * 3)) + 1

        // Load image and set size and position.

        const image = new Image()
        image.src = './material/life/heart.png'
        image.onload = () => {
            const scale = 0.1 + (Math.random() / 4)
            this.image = image
            this.width = image.width * scale
            this.height = image.height * scale
            this.x = canvas.width - this.width + 500
            this.y = Math.floor(Math.random() * (900 - 100 + 1) + 100)
        }
    }


    // Draws the extra life on the screen and updates it position.

    draw() {
        if (this.image) {
            this.x = this.x - (velocity * this.speeder); //Update object's position.
            c.font = parseInt((50)) + 'px monospace';
            if (typeof this.image == undefined) {
                console.log('Hey man your image is undefined again.')
            }
            c.drawImage(
                this.image,
                this.x,
                this.y,
                this.width,
                this.height)
            c.fillText(this.word, this.x, this.y + 100)
        }
    }
}


class Laser {

    // This class handles creating and drawing the laser.

    constructor(objectX, objectY) {

        // Sets the end position the laser is targeting.

        this.x = objectX + 100;
        this.y = objectY + 100;

        //The counter represents the amount of frames the laser will stay on screen for.

        this.counter = 3;

        // Play laser sound effect when laser is created.

        try {
            const laserAudio = new Audio('./material/audio/laser.mp3');
            laserAudio.volume = 0.2;
            laserAudio.play().catch(() => {}); // May fail in iframe
        } catch (e) {
            // Audio not available - continue without sound
        }
    }


    // Draws the laser on the screen.

    draw() {

        // color of laser.

        c.strokeStyle = 'red';

        // Width of laser.

        c.lineWidth = 15;

        // draw a red line
        c.beginPath();
        c.moveTo(300, canvas.height / 2 - 40)
        c.lineTo(this.x, this.y)
        c.stroke();
    }
}


class Actors {

    /* The actors class will keep track of the position, spawning, and destroying of
    all the moving actors in the screen. */

    constructor() {

        

        // There are five different planet images stored in a list.

        this.planetChoice = ['./material/planets/planet1.png', './material/planets/planet2.png', './material/planets/planet3.png', './material/planets/planet4.png', './material/planets/planet5.png'];

        // When actor's class is initialized, three meteors are spawned on the screen.

        this.meteors = [new Meteor(), new Meteor(), new Meteor()];

        // When actor's class is initialized, no bonus lifes are spawned on the screen.

        this.lives = [];

        // When actor's class is initialized, one planet is spawned on the screen.

        this.planets = [new Planet(this.choosePlanet())];

        // When actor's class is initialized, initialize lists of lasers and explosions

        this.lasers = [];
        this.explosions = [];
    

        // When actor's class is initialized, one a list of stars populated with 540 stars are created.
        
        this.stars = [];

        for (let i = 0; i < 1080; i++){
            this.stars.push(new Star(true))
            i++
        }
        

    }

    // The following method chooses which planet image is used when a planet spawns.

    choosePlanet() {

        /* When list of planet is not empty, pick a random picture. Then remove
        the picture from the list, so that it can't be picked again later on. */

        if (this.planetChoice.length != 0) {
            var choice = Math.floor(Math.random() * this.planetChoice.length)
            var planetAddress = this.planetChoice[choice]
            this.planetChoice.splice(choice, 1);
            return planetAddress
        }

        /* If the list of planet pictures is empty, repopulate the list and pick a random picture.
        Then remove the picture from the list, so that it can't be picked again later on. */
        else {
            this.planetChoice = ['./material/planets/planet1.png', './material/planets/planet2.png', './material/planets/planet3.png', './material/planets/planet4.png', './material/planets/planet5.png']
            var choice = Math.floor(Math.random() * this.planetChoice.length)
            var planetAddress = this.planetChoice[choice]
            this.planetChoice.splice(choice, 1);
            return planetAddress
        }
    }

    // This functions spawns a new star oustside the screen.

    spawnStar() {
        this.stars.push(new Star(false))
    }

    // This function removes a star.

    destroyStar(index) {
        this.stars.splice(index, 1);
    }

    // Add a new instance of meteor to the "meteors" list. (Spawn a meteor on screen.)

    spawnMeteor() {
        this.meteors.push(new Meteor())
    }

    // Remove instance of Meteor from the "meteors" list. (Remove meteor from screen.)

    destroyMeteor(index) {
        var xPosition = this.meteors[index].x
        var yPosition = this.meteors[index].y
        try {
            var audio = new Audio('./material/audio/explosion.wav');
            audio.play().catch(() => {}); // May fail in iframe
        } catch (e) {
            // Audio not available - continue without sound
        }
        this.addExplosion(xPosition, yPosition)
        this.meteors.splice(index, 1);
    }

    // Add a new instance of LifeBonus to the "lives" list. (Spawn an extra life on screen.)

    spawnLife() {
        this.lives.push(new LifeBonus())
    }

    // Remove instance of LifeBonus from the "lives" list. (Remove extra life from screen.)

    destroyLife(index) {
        this.lives.splice(index, 1);
    }

    /* This method checks if word typed by user matches word assigned to
    a meteor or extra life. */

    checkActorMatch(targetWord, life) {

        /* Checks to see if targetWord matches with any of the meteors or lives, if so it deletes it and spawns another */

        for (let i = 0; i < this.meteors.length; i++) {
            if (this.meteors[i].word == targetWord) {
                this.lasers.push(new Laser(this.meteors[i].x, this.meteors[i].y))
                this.destroyMeteor(i)
                this.spawnMeteor()
            }
        }
        for (let i = 0; i < this.lives.length; i++) {
            if (this.lives[i].word == targetWord) {
                this.destroyLife(i)
                life.addLife();
            }
        }
    }

    // This function removes the ship from the screen and spawns explosion on its spot.

    destroyShip(){
        this.addExplosion(50, (canvas.height / 2) - (this.ship[0].height) + 25 )
        this.ship = [];

    }

    destroyStarsMedium(index){
        this.stars_medium.splice(index, 1);
    }
    spawnStarsBig(){
        this.stars_big.push(new StarsBig(1920));
    }

    destroyStarsBig(index){
        this.stars_big.splice(index, 1);
    }

    // Add a new instance of Planet to the "planets" list. (Spawn a planet on screen.)

    spawnPlanet() {
        this.planets.push(new Planet(this.choosePlanet()));
    }

    // Remove instance of Planet from the "planets" list. (Remove planet from screen.)

    destroyPlanet(index) {
        this.planets.splice(index, 1);
    }

    // This function spawns an explosion in a specified position.

    addExplosion(xPosition, yPosition) {
        this.explosions.push(new Explosion(xPosition, yPosition))
    }


}


class Input {

    //The "Input" class listens and tracks what the user has typed.

    constructor() {

        // "targetWord" holds the letters of the word the user is currently typing.

        this.targetWord = []
    }

    // Adds a letter to the targetWord

    addLetter(character) {
        this.targetWord.push(character)
    }

    // Deletes a letter from the targetWord

    deleteLetter() {
        this.targetWord.pop()
    }

    // Converts the list targetWord into a string and then calls checkActorMatch to possibly delete actors

    checkWord() {

        // basically check to see if this word is in any of the meteors, delete the meteors that it matches

        let current_word = '';
        for (let character in this.targetWord) {
            current_word = current_word + this.targetWord[character];
        }

        if (current_word == 'GODMODE'){
            life.life = 999999
        }

        this.targetWord = [];
        actors.checkActorMatch(current_word, life);
    }

    // Display current targetWord

    draw() {
        c.font = +parseInt((50)) + 'px monospace';
        c.fillText(this.targetWord.join(""), 15, 1000)
    }

    // Event listener, handle input, deal with letters, backspace, and enter/spacebar

    checkForInput() {
        // Prevent adding duplicate listeners
        if (keyListenerAdded) return;
        keyListenerAdded = true;

        document.addEventListener('keydown', function(e) {
            // First user interaction: try to enable audio (fixes local autoplay restrictions)
            ensureMusicPlaying();

            // Ignore input when game is over
            if (gameOver) return;

            // Skip if input came from mobileInput (it has its own handlers)
            if (e.target === mobileInput) return;
            
            switch (e.keyCode) {
                case 13: // enter
                    input.checkWord();
                    break;
                case 32: // spacebar
                    input.checkWord();
                    break;
                case 8: // backspace
                    input.deleteLetter();
                    break;
                case 65: // a
                    input.addLetter('A')
                    break;
                case 66: // b
                    input.addLetter('B')
                    break;
                case 67: // c
                    input.addLetter('C')
                    break;
                case 68: // d
                    input.addLetter('D')
                    break;
                case 69: // e
                    input.addLetter('E')
                    break;
                case 70: // f
                    input.addLetter('F')
                    break;
                case 71: // g
                    input.addLetter('G')
                    break;
                case 72: // h
                    input.addLetter('H')
                    break;
                case 73: // i
                    input.addLetter('I')
                    break;
                case 74: // j
                    input.addLetter('J')
                    break;
                case 75: // k
                    input.addLetter('K')
                    break;
                case 76: // l
                    input.addLetter('L')
                    break;
                case 77: // m
                    input.addLetter('M')
                    break;
                case 78: // n
                    input.addLetter('N')
                    break;
                case 79: // o
                    input.addLetter('O')
                    break;
                case 80: // p
                    input.addLetter('P')
                    break;
                case 81: // q
                    input.addLetter('Q')
                    break;
                case 82: // r
                    input.addLetter('R')
                    break;
                case 83: // s
                    input.addLetter('S')
                    break;
                case 84: // t
                    input.addLetter('T')
                    break;
                case 85: // u
                    input.addLetter('U')
                    break;
                case 86: // v
                    input.addLetter('V')
                    break;
                case 87: // w
                    input.addLetter('W')
                    break;
                case 88: // x
                    input.addLetter('X')
                    break;
                case 89: // y
                    input.addLetter('Y')
                    break;
                case 90: // z
                    input.addLetter('Z')
                    break;
            };
        })
    }
}


// Function to reset the game
function resetGame() {
    // Reset game state
    gameOver = false;
    scoreSubmitted = false;
    velocity = 1;
    lifeFrequency = 0;

    // Recreate game objects (keep existing key listener, so do NOT call checkForInput again)
    input = new Input();
    score = new Score();
    player = new Player();
    actors = new Actors();
    life = new Life();
    ensureMusicPlaying();

    // Hide game over screen
    if (gameOverScreen) {
        gameOverScreen.style.display = 'none';
    }

    // Re-focus mobile input on reset
    if (isMobile) {
        setTimeout(focusMobileInput, 100);
    }

    // Restart the game loop
    update();
}



function update() {

    // Clears the screen from all elements.

    c.clearRect(0, 0, canvas.width, canvas.height);


    for (var i = 0; i < actors.stars.length; i++) {
        if (actors.stars.length != 0) {
            actors.stars[i].draw()
        }
    }

    for (var i = 0; i < actors.stars.length; i++) {
        if (actors.stars.length != 0) {
            if (actors.stars[i].x < -20) {
                actors.destroyStar(i)
                actors.spawnStar()
            }
        }
    }
    


    // Checks if it needs to destroy and spawn a planet.


    for (var i = 0; i < actors.planets.length; i++) {
        if (actors.planets.length != 0) {
            if (actors.planets[i].x < -500) {
                actors.destroyPlanet(i)
                actors.spawnPlanet()
            }
        }
    }

    // Draws the planet on the screen (and updates its position).

    for (var i = 0; i < actors.planets.length; i++) {
        if (actors.planets.length != 0) {
            actors.planets[i].draw()
        }
    }

    // Draws all lasers on the screen
    for (var i = 0; i < actors.lasers.length; i++) {
        if (actors.lasers.length != 0) {
            actors.lasers[i].draw();
            // console.log('calling draw()');
        }
    }



    // Removes any lasers that need to be removed, otherwise ticks their counter down one

    for (var i = 0; i < actors.lasers.length; i++) {
        if (actors.lasers.length != 0) {
            if (actors.lasers[i].counter < 0) {
                actors.lasers.splice(i); // check to see if this works, haven't tested it yet
            } else {
                actors.lasers[i].counter -= 1;
            }
        }
    }


    // Every time the player gaines 100 points, add a new meteor into the loop.

    if (Math.floor(score.getScore()) % 100 == 0) {
        actors.spawnMeteor()
        score.score += 1 //Add one to make sure score isn't 100 by next frame.
    }


    // Draw each meteor on the screen (and update their position).

    for (var i = 0; i < actors.meteors.length; i++) {
        if (actors.meteors.length != 0) {
            actors.meteors[i].draw()
        }
    }


    // Draw each explosion on the screen (and update their position).

    for (var i = 0; i < actors.explosions.length; i++) {
        if (actors.explosions.length != 0) {
            actors.explosions[i].draw()
        }
    }


    // Update frame used for each explosion displayed on the screen.

    for (var i = 0; i < actors.explosions.length; i++) {
        if (actors.explosions.length != 0) {
            if (actors.explosions[i].spriteSelection == 24) {
                actors.explosions.splice(i, 1)
            }
        }
    }

    // Update frame counter for each explosion of the screen.

    for (var i = 0; i < actors.explosions.length; i++) {
        if (actors.explosions.length != 0) {
            actors.explosions[i].increment_frame_counter()
        }
    }



    // Draw any bonus lives that have spawned.

    for (var i = 0; i < actors.lives.length; i++) {
        if (actors.lives.length != 0) {
            actors.lives[i].draw()
        }
    }

    //Checks if bonus life has reached past the ship; if so, destroy the life.

    for (var i = 0; i < actors.lives.length; i++) {
        if (actors.lives.length != 0) {
            if (actors.lives[i].x < -100) {
                actors.destroyLife(i)
            }
        }
    }

    

    

    // Increment the player's score in each frame.

    if (!gameOver){
        score.increment()
    }

    // Display the player's current score on the screen.


    score.draw()

    // Draw the player ship on the screen.

    player.draw()



    // Each frame, increase the standard velocity by a small increment.

    velocity = velocity + .0001

    // Display the player's current health.

    life.draw()

    // Display the letters the user has currently typed.

    input.draw()


    /* Increase "lifeFrequency" increments by 1 each frame. */

    lifeFrequency += 1;

    // When "lifeFrequency" reaches 1000, span a bonus life, and reset the "lifeFrequency" value to 0. 

    if (lifeFrequency == 1000) {
        actors.spawnLife()
        lifeFrequency = 0;
    }

    // Checks if meteors have reached ship.

    for (var i = 0; i < actors.meteors.length; i++) {
        if (actors.meteors[i].x < 50) {
            actors.destroyMeteor(i) // Destroy meteors if it reaches ship.
            actors.spawnMeteor() // Spawn new meteor.
            life.loseLife(player) // Lose life.
            if (life.getLife() == 0) { // test if lives are gone
                gameOver = true; // stops game loop
                

            }
        }}

    
    if (gameOver){
        // Submit score to Mesa leaderboard (only once)
        if (!scoreSubmitted) {
            scoreSubmitted = true;
            const finalScore = Math.floor(score.getScore());
            
            // Submit to Mesa leaderboard if SDK is available and user is logged in
            if (window.Mesa && window.Mesa.user) {
                const user = window.Mesa.user.get();
                const isLoggedIn = window.Mesa.user.isLoggedIn();
                const playerName = user && user.username ? user.username : 'Player';
                
                if (isLoggedIn) {
                    window.Mesa.leaderboard.submit({
                        key: 'default',
                        playerName: playerName,
                        displayValue: finalScore.toString(),
                        sortValue: finalScore
                    }).then(result => {
                        if (result.error) {
                            console.warn('Failed to submit score:', result.error);
                        }
                    });
                }
            }
            
            // Show game over screen
            if (finalScoreElement) {
                finalScoreElement.textContent = `Score: ${finalScore}`;
            }
            if (gameOverScreen) {
                gameOverScreen.style.display = 'flex';
            } else {
                console.error("Critical Error: gameOverScreen element not found in DOM");
            }
        }
        
        // Don't continue the game loop
        return;
    }
    


    // Runs the game loop
    if (!gameOver) {
        requestAnimationFrame(update); // wait for the browser to be ready to present another animation frame.    
    }


}







// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGame);
} else {
    startGame();
}
