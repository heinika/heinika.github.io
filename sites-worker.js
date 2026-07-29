export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/attractions") {
      const city = (url.searchParams.get("city") || "").trim().slice(0, 40);
      if (!city) return Response.json({ error: "city is required" }, { status: 400 });
      const query = `${city} (公园 OR 博物馆 OR 景区 OR 风景区 OR 古城 OR 遗址 OR 寺 OR 山 OR 湖 OR 塔 OR 宫 OR 陵)`;
      const parameters = new URLSearchParams({
        action: "query",
        format: "json",
        origin: "*",
        generator: "search",
        gsrsearch: query,
        gsrnamespace: "0",
        gsrlimit: "28",
        prop: "coordinates|pageimages|extracts|info",
        pithumbsize: "720",
        piprop: "thumbnail",
        exintro: "1",
        explaintext: "1",
        inprop: "url"
      });
      const upstream = await fetch(`https://zh.wikipedia.org/w/api.php?${parameters}`, {
        headers: { "User-Agent": "HeinikaCityAtlas/1.0 (portfolio attraction viewer)" }
      });
      if (!upstream.ok) {
        return Response.json({ error: "upstream unavailable" }, { status: 502 });
      }
      return new Response(upstream.body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=21600"
        }
      });
    }

    if (url.pathname === "/api/attraction-image") {
      const source = url.searchParams.get("src") || "";
      let imageUrl;
      try {
        imageUrl = new URL(source);
      } catch {
        return new Response("Invalid image URL", { status: 400 });
      }
      if (imageUrl.protocol !== "https:" || imageUrl.hostname !== "upload.wikimedia.org") {
        return new Response("Image host is not allowed", { status: 403 });
      }
      const upstream = await fetch(imageUrl, {
        headers: { "User-Agent": "HeinikaCityAtlas/1.0 (portfolio attraction viewer)" }
      });
      if (!upstream.ok) return new Response("Image unavailable", { status: 502 });
      const headers = new Headers();
      headers.set("Content-Type", upstream.headers.get("Content-Type") || "image/jpeg");
      headers.set("Cache-Control", "public, max-age=604800, immutable");
      return new Response(upstream.body, { headers });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    const notFoundUrl = new URL("/404.html", request.url);
    const notFound = await env.ASSETS.fetch(new Request(notFoundUrl, request));
    return new Response(notFound.body, {
      status: 404,
      headers: notFound.headers
    });
  }
};
