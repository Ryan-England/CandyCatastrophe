class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 400;
        this.DRAG = 1200;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 2000;
        this.JUMP_VELOCITY = -500;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
        this.SPRING_STRENGTH = -200;
        this.jumpBoost = 0;
        this.numJumps = 2;
        this.jumpsRemaining = 2;

        this.springTimer = 4;
        this.springCountdown = 0;

        this.end_screen_y = 220;
        this.end_game = false;
    }

    preload() {
        this.load.scenePlugin('AnimatedTiles', './lib/AnimatedTiles.js', 'animatedTiles', 'animatedTiles');
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        //this.map = this.add.tilemap("platformer-level-1", 18, 18, 45, 25);
        this.map = this.add.tilemap("PlatLevel", 18, 18, 120, 30);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        // this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");
        this.tileset = [this.map.addTilesetImage("plat_tilemap_packed", "plat_tilemap"), this.map.addTilesetImage("food_tilemap_packed", "food_tilemap")];
        //this.tileset = this.map.addTilesetImage("food_tilemap_packed", "food_tilemap");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collide: true
        });

        this.lockAndKeyLayer = this.map.createLayer("Removable-Platforms", this.tileset, 0,0);

        // This should be working, I have no idea why it isn't
        this.lockAndKeyLayer.setCollisionByProperty({
            collide: true
        });

        this.animatedTiles.init(this.map);

        // Find coins in the "Objects" layer in Phaser
        // Look for them by finding objects with the name "coin"
        // Assign the coin texture from the tilemap_sheet sprite sheet
        // Phaser docs:
        // https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Tilemaps.Tilemap-createFromObjects

        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "sweet_sheet",
            frame: 14
        });

        // Since createFromObjects returns an array of regular Sprites, we need to convert 
        // them into Arcade Physics sprites (STATIC_BODY, so they don't move) 
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);

        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);

        this.spawn = this.map.createFromObjects("Objects", {
            name: "playerSpawn",
            key: "tilemap_sheet",
            frame: 111
        });

        this.physics.world.enable(this.spawn, Phaser.Physics.Arcade.STATIC_BODY);

        this.testGroup = this.add.group(this.spawn);

        this.goal = this.map.createFromObjects("Objects", {
            name: "goal",
            key: "tilemap_sheet",
            frame: 67
        });

        this.physics.world.enable(this.goal, Phaser.Physics.Arcade.STATIC_BODY);

        this.goalGroup = this.add.group(this.goal);

        this.key = this.map.createFromObjects("Objects", {
            name: "key",
            key: "tilemap_sheet",
            frame: 27
        });

        this.physics.world.enable(this.key, Phaser.Physics.Arcade.STATIC_BODY);

        this.keyGroup = this.add.group(this.key);

        // console.log(this.testGroup.getFirstAlive().x);
        // console.log(this.testGroup.getFirstAlive().y);

        this.springs = this.map.createFromObjects("Objects", {
            name: "spring",
            key: "tilemap_sheet",
            frame: 107
        });

        this.physics.world.enable(this.springs, Phaser.Physics.Arcade.STATIC_BODY);

        this.springGroup = this.add.group(this.springs);

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(this.testGroup.getFirstAlive().x, this.testGroup.getFirstAlive().y, "platformer_characters", "tile_0006.png");
        // my.sprite.player.setCollideWorldBounds(true);

        my.sprite.end_screen = this.add.sprite(1800, -300, "end_screen");

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        // Handle collision detection with coins
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
        });

        this.physics.add.overlap(my.sprite.player, this.springGroup, (obj1, obj2) => {
            this.springCountdown = this.springTimer;
            this.jumpBoost = this.SPRING_STRENGTH;
        });

        this.physics.add.overlap(my.sprite.player, this.goalGroup, (obj1, obj2) => {
            my.sprite.player.active = false;
            my.sprite.player.body.setVelocityX(0);
            obj2.destroy();
            this.end_game = true;
        });

        this.physics.add.overlap(my.sprite.player, this.keyGroup, (obj1, obj2) => {
            this.lockAndKeyLayer.active = false;
            this.lockAndKeyLayer.visible = false;
            obj2.destroy();
        });

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');

        // // debug key listener (assigned to D key)
        // this.input.keyboard.on('keydown-D', () => {
        //     this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
        //     this.physics.world.debugGraphic.clear()
        // }, this);
        this.physics.world.drawDebug = false;
        this.physics.world.debugGraphic.clear()

        // movement vfx
        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_03.png', 'smoke_06.png', 'smoke_08.png', 'star_04.png', 'star_06.png'],
            // TODO: Try: add random: true
            random: true,
            scale: {start: 0.03, end: 0.1},
            // TODO: Try: maxAliveParticles: 8,
            //maxAliveParticles: 8,
            lifespan: 300,
            // TODO: Try: gravityY: -400,
            gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
            frequency: 70
            //collideBottom: true
            //reserve: 40
        });

        my.vfx.jumping = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_03.png', 'star_04.png', 'star_06.png'],
            // TODO: Try: add random: true
            random: true,
            scale: {start: 0.03, end: 0.1},
            // TODO: Try: maxAliveParticles: 8,
            //maxAliveParticles: 8,
            lifespan: 300,
            // TODO: Try: gravityY: -400,
            gravityY: 400,
            alpha: {start: 1, end: 0.1}, 
            frequency: 150
            //collideBottom: true
            //reserve: 40
        });


        my.vfx.walking.stop();

        my.vfx.jumping.stop();
        
        // Camera code
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);
    }

    update() {
        this.springCountdown--;
        if (this.springCountdown < 0) {
            this.jumpBoost = 0;
        }

        if(cursors.left.isDown && my.sprite.player.active) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground

            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();

            }

        } else if(cursors.right.isDown && my.sprite.player.active) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(-this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground

            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();

            }

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            // TODO: have the vfx stop playing
            my.vfx.walking.stop();
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
            my.vfx.jumping.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
            if (my.sprite.player.y > 1000) {
                my.sprite.player.x = this.testGroup.getFirstAlive().x;
                my.sprite.player.y = this.testGroup.getFirstAlive().y;
                my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY + this.jumpBoost);
            }
        } else {
            my.vfx.jumping.stop();
            this.jumpsRemaining = this.numJumps;
        }
        if(this.jumpsRemaining > 0 && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            this.jumpsRemaining--;
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY + this.jumpBoost);
            my.vfx.jumping.start();
            my.vfx.walking.stop();
            this.sound.play("sfx_jump");
        }

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }

        if (this.end_game && my.sprite.end_screen.y < this.end_screen_y) {
            my.sprite.end_screen.y += 3;
        }
    }
}