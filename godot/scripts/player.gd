extends CharacterBody3D
class_name CityPlayer

const WALK_SPEED := 5.0
const RUN_SPEED := 8.0
const JUMP_VELOCITY := 5.2
const GRAVITY := 18.0

var money := 1200
var stamina := 100.0
var driving := false
var car: Node3D
var car_speed := 0.0
var look_yaw := 0.0
var look_pitch := -0.12
var camera_pivot: Node3D
var camera: Camera3D

func _ready() -> void:
	_ensure_action("move_forward", KEY_W, KEY_UP)
	_ensure_action("move_back", KEY_S, KEY_DOWN)
	_ensure_action("move_left", KEY_A, KEY_LEFT)
	_ensure_action("move_right", KEY_D, KEY_RIGHT)
	_ensure_action("run", KEY_SHIFT)
	_ensure_action("jump", KEY_SPACE)
	_ensure_action("interact", KEY_E)
	_ensure_action("save_game", KEY_F5)

	var shape := CapsuleShape3D.new()
	shape.radius = 0.38
	shape.height = 1.8
	var collision := CollisionShape3D.new()
	collision.shape = shape
	collision.position.y = 0.9
	add_child(collision)

	var body_mesh := MeshInstance3D.new()
	var capsule := CapsuleMesh.new()
	capsule.radius = 0.38
	capsule.height = 1.8
	body_mesh.mesh = capsule
	body_mesh.position.y = 0.9
	var body_material := StandardMaterial3D.new()
	body_material.albedo_color = Color("#d9b28d")
	body_mesh.material_override = body_material
	add_child(body_mesh)

	camera_pivot = Node3D.new()
	camera_pivot.position.y = 1.5
	add_child(camera_pivot)
	var arm := SpringArm3D.new()
	arm.spring_length = 5.0
	arm.rotation.x = look_pitch
	camera_pivot.add_child(arm)
	camera = Camera3D.new()
	camera.current = true
	arm.add_child(camera)

func _ensure_action(action_name: String, first_key: Key, second_key: Key = KEY_NONE) -> void:
	if not InputMap.has_action(action_name):
		InputMap.add_action(action_name)
	var keys := [first_key]
	if second_key != KEY_NONE:
		keys.append(second_key)
	for key_code in keys:
		var event := InputEventKey.new()
		event.physical_keycode = key_code
		if not InputMap.action_has_event(action_name, event):
			InputMap.action_add_event(action_name, event)

func _physics_process(delta: float) -> void:
	if driving:
		_update_vehicle(delta)
		return

	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	else:
		if Input.is_action_just_pressed("jump"):
			velocity.y = JUMP_VELOCITY

	var input_2d := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var forward := -camera.global_basis.z
	forward.y = 0
	forward = forward.normalized()
	var right := camera.global_basis.x
	right.y = 0
	right = right.normalized()
	var direction := (right * input_2d.x + forward * input_2d.y).normalized()
	var running := Input.is_action_pressed("run") and stamina > 1.0 and input_2d.length() > 0.1
	var speed := RUN_SPEED if running else WALK_SPEED
	if running:
		stamina = maxf(0.0, stamina - 24.0 * delta)
	else:
		stamina = minf(100.0, stamina + 13.0 * delta)

	if direction.length() > 0.05:
		velocity.x = direction.x * speed
		velocity.z = direction.z * speed
		rotation.y = atan2(-direction.x, -direction.z)
	else:
		velocity.x = move_toward(velocity.x, 0.0, WALK_SPEED * 5.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, WALK_SPEED * 5.0 * delta)
	move_and_slide()

func enter_vehicle(vehicle: Node3D) -> void:
	car = vehicle
	driving = true
	visible = false
	velocity = Vector3.ZERO

func exit_vehicle() -> void:
	if car == null:
		return
	global_position = car.global_position + car.global_basis.x * 2.0 + Vector3.UP * 0.1
	visible = true
	driving = false
	car_speed = 0.0

func _update_vehicle(delta: float) -> void:
	if car == null:
		driving = false
		visible = true
		return
	var throttle := Input.get_action_strength("move_forward") - Input.get_action_strength("move_back")
	var steering := Input.get_action_strength("move_right") - Input.get_action_strength("move_left")
	car_speed = move_toward(car_speed, throttle * 15.0, 9.0 * delta)
	if Input.is_action_pressed("run"):
		car_speed = move_toward(car_speed, 0.0, 22.0 * delta)
	car.rotate_y(-steering * signf(car_speed if absf(car_speed) > 0.1 else 1.0) * 1.5 * delta)
	car.global_position += -car.global_basis.z * car_speed * delta
	car.global_position.x = clampf(car.global_position.x, -56.0, 56.0)
	car.global_position.z = clampf(car.global_position.z, -56.0, 56.0)
	global_position = car.global_position

func add_money(amount: int) -> void:
	money += amount
