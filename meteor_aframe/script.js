let hp = 3;
let gameOver = false;
let ammo = 12;
let maxAmmo = 12;
let reloading = false;
let hits = 0;

function updateHUD() {
  document.querySelector('#ammo').textContent = `Munition: ${ammo}`;
  document.querySelector('#hits').textContent = `Treffer: ${hits}`;
  document.querySelector('#hp').textContent = `HP: ${hp}`;
}

// meteors
AFRAME.registerComponent('chasing-meteor', {
  schema: {
    speed: { type: 'number', default: 0.035 }
  },

  init: function () {
    this.startTime = Date.now();
  },

  tick: function () {
    const meteor = this.el;
    const player = document.querySelector('[camera]');
    const playerPos = new THREE.Vector3();
    player.object3D.getWorldPosition(playerPos);

    const meteorPos = meteor.object3D.position;
    const direction = playerPos.clone().sub(meteorPos).normalize();
    meteor.object3D.position.add(direction.multiplyScalar(this.data.speed));

    // Kollision mit Spieler
    if (meteorPos.distanceTo(playerPos) < 1.2) {
      hp--;
      updateHUD();
      meteor.parentNode.removeChild(meteor);

      if (hp <= 0) {
        triggerGameOver();
      }
      return;
    }

    // Entfernen nach 5 Sekunden, wenn nicht getroffen
    if (Date.now() - this.startTime > 10000) {
      meteor.parentNode.removeChild(meteor);
    }
  }
});

// spawm met
function spawnMeteor() {
  const scene = document.querySelector('a-scene');
  const template = document.querySelector('#meteor-template');

  const clone = template.cloneNode(true);
  clone.setAttribute('visible', 'true');

  const x = (Math.random() - 0.5) * 40;
  const z = (Math.random() - 0.5) * 40;
  const scale = 0.5 + Math.random() * 1.5;

  clone.setAttribute('position', `${x} 6 ${z}`);
  clone.setAttribute('scale', `${scale} ${scale} ${scale}`);
  clone.setAttribute('chasing-meteor', '');

  scene.appendChild(clone);
}
setInterval(spawnMeteor, 1000);

//projectile and collision
AFRAME.registerComponent('projectile', {
  schema: { speed: { type: 'number', default: 0.3 } },

  init: function () {
    this.radius = 0.1;
    this.alive = true;
    setTimeout(() => this.despawn(), 5000);
  },

  despawn: function () {
    if (this.alive && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
      this.alive = false;
    }
  },

  tick: function () {
    if (!this.alive) return;

    const direction = new THREE.Vector3();
    this.el.object3D.getWorldDirection(direction);
    direction.multiplyScalar(-1);
    this.el.object3D.position.add(direction.multiplyScalar(this.data.speed));

    const projectPos = this.el.object3D.position;
    const meteors = document.querySelectorAll('[chasing-meteor]');

    meteors.forEach(meteorEl => {
      if (!meteorEl.parentNode) return;

      const meteorPos = meteorEl.object3D.position;
      const meteorScale = meteorEl.object3D.scale.x;
      const meteorRadius = 0.5 * meteorScale;
      const dist = projectPos.distanceTo(meteorPos);

      if (dist < this.radius + meteorRadius) {
        this.despawn();
        if (meteorEl.parentNode) meteorEl.parentNode.removeChild(meteorEl);
        hits++;
        updateHUD();
      }
    });
  }
});

// shoot proj
function shootProjectile() {
  if (reloading || ammo <= 0) return;

  ammo--;
  updateHUD();

  if (ammo === 0) {
    reloading = true;
    setTimeout(() => {
      ammo = maxAmmo;
      reloading = false;
      updateHUD();
    }, 3000);
  }

  const scene = document.querySelector('a-scene');
  const camera = document.querySelector('[camera]');

  const projectile = document.createElement('a-sphere');
  projectile.setAttribute('radius', '0.1');
  projectile.setAttribute('color', 'red');
  projectile.setAttribute('projectile', '');

  const camPos = new THREE.Vector3();
  camera.object3D.getWorldPosition(camPos);
  projectile.setAttribute('position', `${camPos.x} ${camPos.y} ${camPos.z}`);

  const camRot = new THREE.Euler();
  camRot.copy(camera.object3D.rotation);
  projectile.object3D.rotation.copy(camRot);

  scene.appendChild(projectile);
}

// shoot über pc
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE') {
    shootProjectile();
  }
});
// shoot über phone
window.addEventListener('klick', () => {
  shootProjectile();
});


//BIENEr BEENER NEENER BEENAR BIENE BIENE BIEBE NIEBEN BIENE BIENE BNEINE BIENE
AFRAME.registerComponent('bee', {
  schema: {
    range: { type: 'number', default: 5 },     
    speed: { type: 'number', default: 0.02 }     
  },

  init: function () {
    this.cooldown = false;
    this.direction = new THREE.Vector3();
    this.chooseNewDirection();
    this.lastDirChange = 0;
    this.el.setAttribute('color', 'yellow'); //yellow → kann heilne
  },

  tick: function (time, deltaTime) {
    const player = document.querySelector('[camera]');
    const beePos = this.el.object3D.position;

    // hol spieler pos
    const playerPos = new THREE.Vector3();
    player.object3D.getWorldPosition(playerPos);

    //biene in reichweite
    const toPlayer = playerPos.clone().sub(beePos);
    if (toPlayer.length() > this.data.range) {
      this.direction.lerp(toPlayer.normalize(), 0.02); // leicht zur Kamera hin
    }

    // Bewegung in aktuelle Richtung
    beePos.add(this.direction.clone().multiplyScalar(this.data.speed));

    // richtungswechsel alle 2 Sekunden
    if (time - this.lastDirChange > 2000) {
      this.chooseNewDirection();
      this.lastDirChange = time;
    }

    // Kollision Spieler & healing
    if (!this.cooldown && beePos.distanceTo(playerPos) < 1.2) {
      if (hp < 3) {
        hp++;
        updateHUD(); // Zeige neue HP im HUD
        this.cooldown = true;
        this.el.setAttribute('color', 'gray');

        setTimeout(() => {
          this.cooldown = false;
          this.el.setAttribute('color', 'yellow');
        }, 20000); // 20 Sek. Cooldown
      }
    }
  },

  chooseNewDirection: function () {
    // Wähle zufällige horizontale & leichte vertikale Richtung
    const angleH = Math.random() * Math.PI * 2;
    const angleV = (Math.random() - 0.5) * 0.5; // nicht zu stark hoch/runter
    this.direction.set(
      Math.cos(angleH),
      angleV,
      Math.sin(angleH)
    ).normalize();
  }
});

window.addEventListener('load', () => {
  const cameraRig = document.querySelector('#cameraRig');
  const isMobile = /iPhone|iPad|Android|Mobile|iPod/i.test(navigator.userAgent);

  if (!isMobile) {
    // Auf dem Desktop WASD-Steuerung aktivieren
    cameraRig.setAttribute('wasd-controls', 'acceleration: 40');
  }
});
