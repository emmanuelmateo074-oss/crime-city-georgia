extends Node3D

const PLAYER_SCRIPT = preload("res://scripts/player.gd")
const CITY_LIMIT := 58.0

var player: CityPlayer
var car: Node3D
var ui_label: Label
var message_label: Label
var interaction_button: Button
var mission_started := false
var completed_deliveries := 0
var day_time := 0.25
var save_path := "user://crime_city_georgia_save.json"
var mission_pickup := Vector3(-12, 0, 12)
var mission_dropoff := Vector3(36, 0, -36)
var mission_marker: MeshInstance3D
var total_time := 0.0

func _ready() -> void:
	_build_world()
	_build_player()
	_build_vehicle()
	_build_ui()
	_load_game()
	_show_message("კეთილი იყოს შენი მობრძანება ქალაქში. მიუახლოვდი ნიშნულს და დააჭირე ღილაკს „ურთიერთქმედება“.")

func _process(delta: float) -> void:
	total_time += delta
	day_time = fposmod(day_time + delta / 240.0, 1.0)
	_update_daylight()
	_update_mission_marker()
	_update_hud()
	if Input.is_action_just_pressed("interact"):
		_interact()
	if Input.is_action_just_pressed("save_game"):
		_save_game()

func _build_world() -> void:
	var world_env := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = Sky.new()
	var sky_mat := ProceduralSkyMaterial.new()
	env.sky.sky_material = sky_mat
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.58, 0.62, 0.68)
	env.ambient_light_energy = 0.8
	world_env.environment = env
	add_child(world_env)

	var sun := DirectionalLight3D.new()
	sun.name = "დღე და ღამე"
	sun.rotation_degrees = Vector3(-48, -32, 0)
	sun.shadow_enabled = true
	sun.light_energy = 1.1
	add_child(sun)
	sun.set_meta("sun_light", true)

	_add_box("მიწა", Vector3(0, -0.3, 0), Vector3(120, 0.5, 120), Color("#667553"), false)
	for i in range(-2, 3):
		var coordinate := float(i) * 24.0
		_add_box("გზა", Vector3(coordinate, -0.02, 0), Vector3(7.5, 0.12, 120), Color("#303337"), false)
		_add_box("გზა", Vector3(0, -0.02, coordinate), Vector3(120, 0.12, 7.5), Color("#303337"), false)
		_add_box("ტროტუარი", Vector3(coordinate + 4.6, 0.02, 0), Vector3(1.3, 0.18, 120), Color("#b7aa91"), false)
		_add_box("ტროტუარი", Vector3(0, 0.02, coordinate + 4.6), Vector3(120, 0.18, 1.3), Color("#b7aa91"), false)

	var colors: Array[Color] = [Color("#d8c6a9"), Color("#bbc7c8"), Color("#d0b4a1"), Color("#c7c0ad"), Color("#b9b7ac")]
	for x_index in range(-2, 2):
		for z_index in range(-2, 2):
			var cx := float(x_index) * 24.0 + 12.0
			var cz := float(z_index) * 24.0 + 12.0
			var h := 7.0 + float(posmod(x_index * 7 + z_index * 11 + 40, 4)) * 2.2
			var building_color := colors[posmod(x_index - z_index + 20, colors.size())]
			_add_building(Vector3(cx, h / 2.0, cz), Vector3(9.0, h, 9.0), building_color)
			_add_building(Vector3(cx - 8.0, 2.8, cz - 8.0), Vector3(5.5, 5.6, 5.5), colors[posmod(x_index + z_index + 30, colors.size())])

	_add_box("პარკი", Vector3(-12, 0.02, -12), Vector3(9, 0.12, 9), Color("#668657"), false)
	_add_marker("მიწოდების შეკვეთა", mission_pickup, Color("#f4cb48"))
	mission_marker = _make_marker("დანიშნულება", mission_dropoff, Color("#48d5d0"))

func _add_box(label: String, position: Vector3, size: Vector3, color: Color, solid: bool) -> Node3D:
	var holder: Node3D
	if solid:
		holder = StaticBody3D.new()
	else:
		holder = Node3D.new()
	holder.name = label
	holder.position = position
	var mesh_instance := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = size
	mesh_instance.mesh = box
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = 0.9
	mesh_instance.material_override = material
	holder.add_child(mesh_instance)
	if solid:
		var collision := CollisionShape3D.new()
		var shape := BoxShape3D.new()
		shape.size = size
		collision.shape = shape
		holder.add_child(collision)
	add_child(holder)
	return holder

func _add_building(position: Vector3, size: Vector3, color: Color) -> void:
	var building := _add_box("საცხოვრებელი შენობა", position, size, color, true)
	var sign_mesh := MeshInstance3D.new()
	var sign_box := BoxMesh.new()
	sign_box.size = Vector3(2.4, 0.55, 0.16)
	sign_mesh.mesh = sign_box
	var sign_material := StandardMaterial3D.new()
	sign_material.albedo_color = Color("#315b73")
	sign_mesh.material_override = sign_material
	sign_mesh.position = Vector3(0, size.y * 0.25, size.z / 2.0 + 0.1)
	building.add_child(sign_mesh)

func _add_marker(label_text: String, position: Vector3, color: Color) -> void:
	_make_marker(label_text, position, color)

func _make_marker(label_text: String, position: Vector3, color: Color) -> MeshInstance3D:
	var marker := MeshInstance3D.new()
	marker.name = label_text
	var mesh := CylinderMesh.new()
	mesh.top_radius = 0.7
	mesh.bottom_radius = 0.7
	mesh.height = 0.18
	marker.mesh = mesh
	marker.position = position + Vector3.UP * 0.16
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.emission_enabled = true
	material.emission = color * 0.35
	marker.material_override = material
	add_child(marker)
	return marker

func _build_player() -> void:
	player = CharacterBody3D.new()
	player.name = "მოთამაშე"
	player.set_script(PLAYER_SCRIPT)
	player.position = Vector3(0, 0.15, 8)
	add_child(player)

func _build_vehicle() -> void:
	car = Node3D.new()
	car.name = "პატრული"
	car.position = Vector3(3.2, 0.55, 7.0)
	var body := MeshInstance3D.new()
	var body_mesh := BoxMesh.new()
	body_mesh.size = Vector3(1.8, 0.75, 3.2)
	body.mesh = body_mesh
	var body_mat := StandardMaterial3D.new()
	body_mat.albedo_color = Color("#e8e8e5")
	body_mat.metallic = 0.25
	body.material_override = body_mat
	car.add_child(body)
	var cabin := MeshInstance3D.new()
	var cabin_mesh := BoxMesh.new()
	cabin_mesh.size = Vector3(1.55, 0.62, 1.55)
	cabin.mesh = cabin_mesh
	cabin.position.y = 0.62
	var cabin_mat := StandardMaterial3D.new()
	cabin_mat.albedo_color = Color("#50768c")
	cabin.material_override = cabin_mat
	car.add_child(cabin)
	var stripe := MeshInstance3D.new()
	var stripe_mesh := BoxMesh.new()
	stripe_mesh.size = Vector3(1.84, 0.18, 1.3)
	stripe.mesh = stripe_mesh
	stripe.position.y = 0.12
	var stripe_mat := StandardMaterial3D.new()
	stripe_mat.albedo_color = Color("#173e70")
	stripe.material_override = stripe_mat
	car.add_child(stripe)
	add_child(car)

func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var panel := PanelContainer.new()
	panel.position = Vector2(18, 18)
	panel.custom_minimum_size = Vector2(310, 110)
	layer.add_child(panel)
	var content := VBoxContainer.new()
	panel.add_child(content)
	ui_label = Label.new()
	ui_label.add_theme_font_size_override("font_size", 18)
	content.add_child(ui_label)
	message_label = Label.new()
	message_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	message_label.custom_minimum_size = Vector2(290, 48)
	content.add_child(message_label)

	var save_button := _make_button("შენახვა", Vector2(-150, -68), Vector2(130, 48), layer)
	save_button.pressed.connect(_save_game)
	var interact := _make_button("ურთიერთქმედება", Vector2(-310, -68), Vector2(150, 48), layer)
	interact.pressed.connect(_interact)

	var controls := [
		["↑", "move_forward", Vector2(106, -185)],
		["↓", "move_back", Vector2(106, -75)],
		["←", "move_left", Vector2(48, -130)],
		["→", "move_right", Vector2(164, -130)],
		["სირბილი", "run", Vector2(230, -80)],
		["ხტომა", "jump", Vector2(230, -140)]
	]
	for entry in controls:
		var button := _make_button(entry[0], entry[2], Vector2(54, 50), layer)
		var action_name: String = entry[1]
		button.button_down.connect(func(): Input.action_press(action_name))
		button.button_up.connect(func(): Input.action_release(action_name))
		button.mouse_exited.connect(func(): Input.action_release(action_name))

func _make_button(text_value: String, offset: Vector2, size: Vector2, parent: Control) -> Button:
	var button := Button.new()
	button.text = text_value
	button.position = Vector2(get_viewport().get_visible_rect().size.x, get_viewport().get_visible_rect().size.y) + offset - size
	button.size = size
	button.add_theme_font_size_override("font_size", 16)
	parent.add_child(button)
	return button

func _interact() -> void:
	if player.driving:
		player.exit_vehicle()
		_show_message("მანქანიდან გადმოხვედი.")
		return
	if player.global_position.distance_to(car.global_position) < 3.5:
		player.enter_vehicle(car)
		_show_message("პატრულის მანქანაში ჩაჯექი. გ��მოიყენე ისრები ან WASD, სირბილი — დამუხრუჭებისთვის.")
		return
	if not mission_started and player.global_position.distance_to(mission_pickup) < 4.0:
		mission_started = true
		_show_message("მიწოდება დაიწყო! მიიტანე ამანათი ფირუზისფერ ნიშნულთან.")
		return
	if mission_started and player.global_position.distance_to(mission_dropoff) < 5.0:
		mission_started = false
		completed_deliveries += 1
		player.add_money(250)
		_show_message("მიწოდება დასრულდა. ჯილდო: ₾250.")
		return
	_show_message("ახლოს მისასვლელი ობიექტი არ არის. გამოიყენე რუკაზე მონიშნული შეკვეთა.")

func _update_mission_marker() -> void:
	if mission_marker == null:
		return
	mission_marker.position = (mission_dropoff if mission_started else mission_pickup) + Vector3.UP * (0.18 + sin(total_time * 2.0) * 0.08)
	mission_marker.visible = true

func _update_daylight() -> void:
	var sun := get_node_or_null("დღე და ღამე") as DirectionalLight3D
	if sun == null:
		return
	var phase := day_time * TAU
	sun.rotation_degrees.x = -55.0 + sin(phase) * 45.0
	sun.light_energy = 0.15 + maxf(0.0, sin(phase)) * 1.0

func _update_hud() -> void:
	if player == null or ui_label == null:
		return
	var mission_text := "მიწოდება აქტიურია" if mission_started else "შეკვეთა: ყვითელ ნიშნულთან"
	ui_label.text = "CRIME CITY GEORGIA   |   ფული: ₾%d\nგამძლეობა: %d%%   |   დასრულებული მიწოდება: %d\n%s" % [player.money, int(player.stamina), completed_deliveries, mission_text]

func _show_message(text_value: String) -> void:
	if message_label != null:
		message_label.text = text_value

func _save_game() -> void:
	if player == null:
		return
	var data := {
		"position": [player.global_position.x, player.global_position.y, player.global_position.z],
		"money": player.money,
		"completed_deliveries": completed_deliveries
	}
	var file := FileAccess.open(save_path, FileAccess.WRITE)
	if file == null:
		_show_message("შენახვა ვერ მოხერხდა.")
		return
	file.store_string(JSON.stringify(data))
	_show_message("თამაშის პროგრესი მოწყობილობაზე შეინახა.")

func _load_game() -> void:
	if not FileAccess.file_exists(save_path):
		return
	var file := FileAccess.open(save_path, FileAccess.READ)
	if file == null:
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary:
		return
	var data: Dictionary = parsed
	if data.has("position") and data["position"] is Array and data["position"].size() == 3:
		player.global_position = Vector3(float(data["position"][0]), float(data["position"][1]), float(data["position"][2]))
	player.money = int(data.get("money", player.money))
	completed_deliveries = int(data.get("completed_deliveries", 0))
