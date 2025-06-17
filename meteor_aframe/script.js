let ammo = 12;
let maxAmmo = 12;
let reloading = false;
let hits = 0;
let missed = 0;

function updateHUD() {
  document.querySelector('#ammo').textContent = `Munition: ${ammo}`;
  document.querySelector('#hits').textContent = `Treffer: ${hits}`;
  document.querySelector('#misses').textContent = `Verfehlt: ${missed}`;
}

// meteors
AFRAME.registerComponent('falling-meteor', {
  schema: { speed: { type: 'number', default: 0.02 } },

  tick: function () {
    const pos = this.el.object3D.position;
    pos.y -= this.data.speed;

    const lane = document.querySelector('#lane').object3D;

    if (pos.y <= 0.1) {
      if (Math.abs(pos.x - lane.position.x) < 50 &&
          Math.abs(pos.z - lane.position.z) < 50) {
        this.el.parentNode.removeChild(this.el);
        missed++;
        updateHUD();
      }
    }

    if (pos.y < -10 && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
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
  clone.setAttribute('falling-meteor', '');

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
    const meteors = document.querySelectorAll('[falling-meteor]');

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

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    shootProjectile();
  }
});