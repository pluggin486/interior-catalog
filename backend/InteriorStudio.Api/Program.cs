using System.Globalization;
using System.Text.Json;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("Postgres")
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__Postgres")
    ?? throw new InvalidOperationException("Set ConnectionStrings:Postgres.");
var dataSource = NpgsqlDataSource.Create(connectionString);
builder.Services.AddSingleton(dataSource);
builder.Services.AddProblemDetails();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins("http://127.0.0.1:5174", "http://localhost:5174")
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();
app.UseExceptionHandler();
app.UseCors();
app.MapGet("/health/ready", async (NpgsqlDataSource db, CancellationToken ct) =>
{
    await using var connection = await db.OpenConnectionAsync(ct);
    await using var command = new NpgsqlCommand("SELECT 1", connection);
    await command.ExecuteScalarAsync(ct);
    return Results.Ok(new { status = "ready", database = "interior_demo" });
});

var migrationsPath = Path.Combine(AppContext.BaseDirectory, "migrations");
await ApplyMigrationsAsync(dataSource, migrationsPath, app.Lifetime.ApplicationStopping);

var api = app.MapGroup("/api/v1");
api.MapGet("/catalog/products", async (
    string? q, string? category, string? material, NpgsqlDataSource db, CancellationToken ct) =>
{
    await using var connection = await db.OpenConnectionAsync(ct);
    await using var command = new NpgsqlCommand("""
        SELECT coalesce(jsonb_agg(to_jsonb(p) - 'sort_order' ORDER BY p.sort_order), '[]'::jsonb)::text
        FROM (
          SELECT p.slug, p.title, p.description, c.slug AS category, c.name AS category_name,
                 m.slug AS material, m.name AS material_name, m.color, p.sort_order, p.price_from, p.price_to,
                 p.width_cm, p.height_cm, p.depth_cm, p.image_tone, p.features
          FROM products p
          JOIN categories c ON c.id = p.category_id AND c.is_active
          JOIN materials m ON m.id = p.material_id AND m.is_active
          WHERE p.is_active
            AND (@q::text IS NULL OR lower(concat_ws(' ', p.title, p.description, c.name, m.name)) LIKE '%' || lower(@q::text) || '%')
            AND (@category::text IS NULL OR c.slug = @category::text)
            AND (@material::text IS NULL OR m.slug = @material::text)
        ) p
        """, connection);
    command.Parameters.AddWithValue("q", (object?)q?.Trim() ?? DBNull.Value);
    command.Parameters.AddWithValue("category", (object?)category ?? DBNull.Value);
    command.Parameters.AddWithValue("material", (object?)material ?? DBNull.Value);
    var json = (string?)await command.ExecuteScalarAsync(ct) ?? "[]";
    return Results.Content(json, "application/json");
});

api.MapGet("/catalog/products/{slug}", async (string slug, NpgsqlDataSource db, CancellationToken ct) =>
{
    await using var connection = await db.OpenConnectionAsync(ct);
    await using var command = new NpgsqlCommand("""
        SELECT to_jsonb(p)::text
        FROM (
          SELECT p.slug, p.title, p.description, c.slug AS category, c.name AS category_name,
                 m.slug AS material, m.name AS material_name, m.color, p.price_from, p.price_to,
                 p.width_cm, p.height_cm, p.depth_cm, p.image_tone, p.features
          FROM products p JOIN categories c ON c.id = p.category_id
          JOIN materials m ON m.id = p.material_id
          WHERE p.slug = @slug AND p.is_active AND c.is_active AND m.is_active
        ) p
        """, connection);
    command.Parameters.AddWithValue("slug", slug);
    var json = (string?)await command.ExecuteScalarAsync(ct);
    return json is null ? Results.NotFound() : Results.Content(json, "application/json");
});

api.MapGet("/catalog/materials", (NpgsqlDataSource db, CancellationToken ct) => ReadJsonAsync(
    db, "SELECT coalesce(jsonb_agg(to_jsonb(m) - 'sort_order' ORDER BY m.sort_order), '[]'::jsonb)::text FROM (SELECT slug, name, color, description, properties, price_per_m2, sort_order FROM materials WHERE is_active) m", ct));
api.MapGet("/catalog/categories", (NpgsqlDataSource db, CancellationToken ct) => ReadJsonAsync(
    db, "SELECT coalesce(jsonb_agg(to_jsonb(c) - 'sort_order' ORDER BY c.sort_order), '[]'::jsonb)::text FROM (SELECT slug, name, sort_order FROM categories WHERE is_active) c", ct));
api.MapGet("/catalog/services", (NpgsqlDataSource db, CancellationToken ct) => ReadJsonAsync(
    db, "SELECT coalesce(jsonb_agg(to_jsonb(s) - 'sort_order' ORDER BY s.sort_order), '[]'::jsonb)::text FROM (SELECT slug, name, description, price, sort_order FROM services WHERE is_active) s", ct));
api.MapGet("/calculator/options", async (NpgsqlDataSource db, CancellationToken ct) =>
{
    var materials = await JsonScalarAsync(db, "SELECT coalesce(jsonb_agg(to_jsonb(m) - 'sort_order' ORDER BY m.sort_order), '[]'::jsonb)::text FROM (SELECT slug, name, color, price_per_m2 FROM materials WHERE is_active) m", ct);
    var services = await JsonScalarAsync(db, "SELECT coalesce(jsonb_agg(to_jsonb(s) - 'sort_order' ORDER BY s.sort_order), '[]'::jsonb)::text FROM (SELECT slug, name, price, sort_order FROM services WHERE is_active) s", ct);
    return Results.Content($"{{\"materials\":{materials},\"services\":{services},\"isPreliminary\":true}}", "application/json");
});
api.MapPost("/calculator/estimate", async (EstimateRequest request, NpgsqlDataSource db, CancellationToken ct) =>
{
    if (request.WidthCm is <= 0 or > 2000 || request.HeightCm is <= 0 or > 2000 || request.DepthCm is <= 0 or > 2000)
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["dimensions"] = ["Все размеры должны быть от 1 до 2000 см."] });
    if (string.IsNullOrWhiteSpace(request.Material))
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["material"] = ["Выберите материал."] });

    await using var connection = await db.OpenConnectionAsync(ct);
    await using var transaction = await connection.BeginTransactionAsync(ct);
    await using var materialCommand = new NpgsqlCommand("SELECT price_per_m2 FROM materials WHERE slug = @slug AND is_active", connection, transaction);
    materialCommand.Parameters.AddWithValue("slug", request.Material);
    var rateValue = await materialCommand.ExecuteScalarAsync(ct);
    if (rateValue is null or DBNull) return Results.ValidationProblem(new Dictionary<string, string[]> { ["material"] = ["Выберите доступный материал."] });
    var rate = Convert.ToDecimal(rateValue, CultureInfo.InvariantCulture);
    var serviceSlugs = (request.Services ?? []).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.Ordinal).ToArray();
    decimal servicesTotal = 0;
    if (serviceSlugs.Length > 0)
    {
        await using var serviceCommand = new NpgsqlCommand("SELECT slug, price FROM services WHERE is_active AND slug = ANY(@slugs)", connection, transaction);
        serviceCommand.Parameters.AddWithValue("slugs", serviceSlugs);
        await using var reader = await serviceCommand.ExecuteReaderAsync(ct);
        var found = new HashSet<string>(StringComparer.Ordinal);
        while (await reader.ReadAsync(ct)) { found.Add(reader.GetString(0)); servicesTotal += reader.GetDecimal(1); }
        if (found.Count != serviceSlugs.Length)
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["services"] = ["В запросе есть недоступная услуга."] });
    }
    await transaction.CommitAsync(ct);
    var area = request.WidthCm!.Value * request.HeightCm!.Value / 10000m;
    var materialTotal = decimal.Round(area * rate, 2, MidpointRounding.AwayFromZero);
    return Results.Ok(new EstimateResponse(area, materialTotal, servicesTotal, decimal.Round(materialTotal + servicesTotal, 2), true));
});
api.MapPost("/inquiries", async (InquiryRequest request, HttpRequest httpRequest, NpgsqlDataSource db, CancellationToken ct) =>
{
    var key = httpRequest.Headers["Idempotency-Key"].ToString();
    var errors = new Dictionary<string, string[]>();
    if (string.IsNullOrWhiteSpace(key) || key.Length > 128) errors["Idempotency-Key"] = ["Передайте ключ длиной от 1 до 128 символов."];
    if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length < 2 || request.Name.Length > 120) errors["name"] = ["Укажите имя длиной от 2 до 120 символов."];
    if (string.IsNullOrWhiteSpace(request.Phone) || request.Phone.Trim().Length < 7 || request.Phone.Length > 40) errors["phone"] = ["Укажите номер телефона."];
    if (request.Email?.Length > 200) errors["email"] = ["Email слишком длинный."];
    if (request.Comment?.Length > 2000) errors["comment"] = ["Комментарий не должен превышать 2000 символов."];
    if (errors.Count > 0) return Results.ValidationProblem(errors);

    await using var connection = await db.OpenConnectionAsync(ct);
    await using var command = new NpgsqlCommand("""
        INSERT INTO inquiries (request_id, idempotency_key, source, contact_name, phone, email, product_slug, material_slug, dimensions, service_slugs, comment)
        VALUES (@id, @key, @source, @name, @phone, @email, @product, @material, @dimensions, @services, @comment)
        ON CONFLICT (idempotency_key) DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
        RETURNING request_id, created_at
        """, connection);
    var requestId = Guid.NewGuid();
    command.Parameters.AddWithValue("id", requestId);
    command.Parameters.AddWithValue("key", key);
    command.Parameters.AddWithValue("source", request.Source is "comparison" or "calculator" ? request.Source : "catalog");
    command.Parameters.AddWithValue("name", request.Name!.Trim());
    command.Parameters.AddWithValue("phone", request.Phone!.Trim());
    command.Parameters.AddWithValue("email", (object?)request.Email?.Trim() ?? DBNull.Value);
    command.Parameters.AddWithValue("product", (object?)request.ProductSlug ?? DBNull.Value);
    command.Parameters.AddWithValue("material", (object?)request.MaterialSlug ?? DBNull.Value);
    command.Parameters.AddWithValue("dimensions", JsonDocument.Parse(JsonSerializer.Serialize(request.Dimensions ?? new Dictionary<string, int>())));
    command.Parameters.AddWithValue("services", request.Services ?? []);
    command.Parameters.AddWithValue("comment", (object?)request.Comment?.Trim() ?? DBNull.Value);
    await using var reader = await command.ExecuteReaderAsync(ct);
    await reader.ReadAsync(ct);
    return Results.Json(new { requestId = reader.GetGuid(0), createdAt = reader.GetDateTime(1) }, statusCode: StatusCodes.Status201Created);
});

app.Run();

static async Task<IResult> ReadJsonAsync(NpgsqlDataSource db, string sql, CancellationToken ct) => Results.Content(await JsonScalarAsync(db, sql, ct), "application/json");
static async Task<string> JsonScalarAsync(NpgsqlDataSource db, string sql, CancellationToken ct)
{
    await using var connection = await db.OpenConnectionAsync(ct);
    await using var command = new NpgsqlCommand(sql, connection);
    return (string?)await command.ExecuteScalarAsync(ct) ?? "[]";
}
static async Task ApplyMigrationsAsync(NpgsqlDataSource db, string directory, CancellationToken ct)
{
    await using var connection = await db.OpenConnectionAsync(ct);
    await using (var setup = new NpgsqlCommand("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())", connection)) await setup.ExecuteNonQueryAsync(ct);
    foreach (var file in Directory.GetFiles(directory, "*.sql").Order(StringComparer.Ordinal))
    {
        var name = Path.GetFileName(file);
        await using var check = new NpgsqlCommand("SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE name = @name)", connection);
        check.Parameters.AddWithValue("name", name);
        if ((bool)(await check.ExecuteScalarAsync(ct) ?? false)) continue;
        await using var transaction = await connection.BeginTransactionAsync(ct);
        await using var migration = new NpgsqlCommand(await File.ReadAllTextAsync(file, ct), connection, transaction);
        await migration.ExecuteNonQueryAsync(ct);
        await using var record = new NpgsqlCommand("INSERT INTO schema_migrations(name) VALUES (@name)", connection, transaction);
        record.Parameters.AddWithValue("name", name);
        await record.ExecuteNonQueryAsync(ct);
        await transaction.CommitAsync(ct);
    }
}

public sealed record EstimateRequest(string? Material, decimal? WidthCm, decimal? HeightCm, decimal? DepthCm, string[]? Services);
public sealed record EstimateResponse(decimal AreaM2, decimal MaterialTotal, decimal ServicesTotal, decimal TotalPrice, bool IsPreliminary);
public sealed record InquiryRequest(string? Source, string? Name, string? Phone, string? Email, string? ProductSlug, string? MaterialSlug, Dictionary<string, int>? Dimensions, string[]? Services, string? Comment);
