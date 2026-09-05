// Track-relative arcade handling. Positive angles point left of the road.
export function stepHandling(car, steer, brake, curvature, dt) {
  const drifting = brake && car.speed > 17 && Math.abs(steer) > 0.3;
  car.drifting = drifting;
  const target = brake ? (drifting ? 26 : 13) : car.turboTime > 0 ? 45.5 : 32.4;
  const speedTarget = car.offroad ? Math.min(target, 18) : target;
  car.speed += (speedTarget - car.speed) * (1 - Math.exp(-(brake ? 3.5 : 4.9) * dt));
  // Grip limits the radius at speed. Drift adds yaw authority, while the
  // velocity direction lags behind the nose (a visible rear-wheel slide).
  const grip = drifting ? 46 : 18;
  const maxYaw = grip / Math.max(10, car.speed);
  const assistedYaw = curvature * car.speed;
  const requestedYaw = assistedYaw + steer * (drifting ? 0.95 : 0.7);
  const yawRate = Math.max(-maxYaw, Math.min(maxYaw, requestedYaw));
  const targetSlip = drifting ? steer * 0.4 : 0;
  car.slip += (targetSlip - car.slip) * (1 - Math.exp(-5 * dt));
  const travelAngle = car.heading - car.slip;
  const along = car.speed * Math.max(0.35, Math.cos(travelAngle));
  car.heading += (yawRate - curvature * along) * dt;
  // Straighten naturally when the driver releases the steering.
  car.heading *= Math.exp(-(Math.abs(steer) < 0.08 ? 2.8 : 1.1) * dt);
  car.heading = Math.max(-1, Math.min(1, car.heading));
  car.lateral += Math.sin(car.heading - car.slip) * car.speed * dt;
  car.lateral = Math.max(-11.2, Math.min(11.2, car.lateral));
  car.offroad = Math.abs(car.lateral) > 7.55;
  if (car.offroad) car.lateral *= Math.exp(-0.45 * dt);
  return along;
}
