package com.threer.service;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.nio.FloatBuffer;
import java.util.Base64;
import java.util.Map;

/**
 * Local YOLO26n (ONNX) detector. Replaces the Gemma vision call for the
 * initial scan. Returns the same VisionResult the rest of the app expects.
 *
 * Model file: src/main/resources/models/yolo26n.onnx
 */
@Service
public class YoloVisionService {

    private static final int SIZE = 640;
    private static final float MIN_SCORE = 0.25f;

    private static final String[] COCO = (
            "person,bicycle,car,motorcycle,airplane,bus,train,truck,boat,"
          + "traffic light,fire hydrant,stop sign,parking meter,bench,bird,cat,dog,horse,sheep,cow,elephant,"
          + "bear,zebra,giraffe,backpack,umbrella,handbag,tie,suitcase,frisbee,skis,snowboard,sports ball,"
          + "kite,baseball bat,baseball glove,skateboard,surfboard,tennis racket,bottle,wine glass,cup,fork,"
          + "knife,spoon,bowl,banana,apple,sandwich,orange,broccoli,carrot,hot dog,pizza,donut,cake,chair,"
          + "couch,potted plant,bed,dining table,toilet,tv,laptop,mouse,remote,keyboard,cell phone,microwave,"
          + "oven,toaster,sink,refrigerator,book,clock,vase,scissors,teddy bear,hair drier,toothbrush"
    ).split(",");

    /** COCO class -> {container, material}. Edit freely. */
    private static final Map<String, String[]> MATERIAL = Map.ofEntries(
            Map.entry("bottle",     new String[]{"bottle", "plastic"}),
            Map.entry("cup",        new String[]{"cup", "paper"}),
            Map.entry("wine glass", new String[]{"glass", "glass"}),
            Map.entry("vase",       new String[]{"vase", "glass"}),
            Map.entry("bowl",       new String[]{"bowl", "unknown"}),
            Map.entry("book",       new String[]{"book", "paper"}),
            Map.entry("cell phone", new String[]{"device", "e-waste"}),
            Map.entry("laptop",     new String[]{"device", "e-waste"}),
            Map.entry("keyboard",   new String[]{"device", "e-waste"}),
            Map.entry("mouse",      new String[]{"device", "e-waste"}),
            Map.entry("remote",     new String[]{"device", "e-waste"}),
            Map.entry("tv",         new String[]{"device", "e-waste"}),
            Map.entry("fork",       new String[]{"cutlery", "metal"}),
            Map.entry("knife",      new String[]{"cutlery", "metal"}),
            Map.entry("spoon",      new String[]{"cutlery", "metal"})
    );

    private final OrtEnvironment env = OrtEnvironment.getEnvironment();
    private OrtSession session;
    private String inputName;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .build();

    @Value("${ocr.url:http://localhost:8000/ocr}")
    private String ocrUrl;

    public YoloVisionService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void init() throws Exception {
        byte[] model = new ClassPathResource("models/yolo26n.onnx")
                .getInputStream().readAllBytes();
        session = env.createSession(model, new OrtSession.SessionOptions());
        inputName = session.getInputNames().iterator().next();
        System.out.println("YOLO model loaded. Input: " + inputName);
    }

    @PreDestroy
    void close() throws Exception {
        if (session != null) session.close();
    }

    public HuggingFaceVisionService.VisionResult analyze(String dataUri) {
        try {
            String b64 = dataUri.contains(",")
                    ? dataUri.substring(dataUri.indexOf(",") + 1)
                    : dataUri;

            BufferedImage src = ImageIO.read(
                    new ByteArrayInputStream(Base64.getDecoder().decode(b64)));

            if (src == null) {
                throw new IllegalArgumentException("Could not decode image");
            }

            float[] data = preprocess(src);

            try (OnnxTensor input = OnnxTensor.createTensor(
                         env, FloatBuffer.wrap(data), new long[]{1, 3, SIZE, SIZE});
                 OrtSession.Result out = session.run(Map.of(inputName, input))) {

                float[][][] res = (float[][][]) out.get(0).getValue();

                int bestCls = -1;
                float bestScore = 0f;
                float[] box = null; // x1,y1,x2,y2 in 640x640 space

                if (res[0].length == 84) {
                    // [1, 84, 8400]: rows 0-3 = cx,cy,w,h ; rows 4-83 = class scores
                    float[][] t = res[0];
                    int anchors = t[0].length;
                    int bestAnchor = -1;
                    for (int a = 0; a < anchors; a++) {
                        for (int c = 0; c < 80; c++) {
                            float sc = t[4 + c][a];
                            if (sc > bestScore) {
                                bestScore = sc;
                                bestCls = c;
                                bestAnchor = a;
                            }
                        }
                    }
                    if (bestAnchor >= 0) {
                        float cx = t[0][bestAnchor], cy = t[1][bestAnchor];
                        float w = t[2][bestAnchor], h = t[3][bestAnchor];
                        box = new float[]{cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2};
                    }
                } else {
                    // [1, N, 6]: x1,y1,x2,y2,score,classId (end-to-end export)
                    for (float[] det : res[0]) {
                        if (det[4] > bestScore) {
                            bestScore = det[4];
                            bestCls = (int) det[5];
                            box = new float[]{det[0], det[1], det[2], det[3]};
                        }
                    }
                }

                System.out.println("YOLO best: "
                        + (bestCls >= 0 ? COCO[bestCls] : "none")
                        + " (" + bestScore + ")");

                if (bestCls < 0 || bestScore < MIN_SCORE) {
                    return new HuggingFaceVisionService.VisionResult(
                            "unknown", "unknown", "unknown", "unknown",
                            "unknown", 0.0, "No recognizable item detected.");
                }

                String label = COCO[bestCls];
                String[] m = MATERIAL.getOrDefault(
                        label, new String[]{"unknown", "unknown"});

                // Read brand/size from the cropped item with Florence-2 OCR
                String brand = "unknown";
                String size = "unknown";
                String ocrText = "";

                long t0 = System.currentTimeMillis();
                JsonNode ocr = callOcr(crop(src, box));
                if (ocr != null) {
                    brand = ocr.path("brand").asText("unknown");
                    size = ocr.path("size").asText("unknown");
                    ocrText = ocr.path("text").asText("");
                }
                System.out.println("OCR took " + (System.currentTimeMillis() - t0)
                        + " ms -> brand=" + brand + ", size=" + size
                        + ", text=" + ocrText);

                String name = "unknown".equals(brand) ? label : brand + " " + label;

                String description = "Detected by YOLO as " + label + "."
                        + (ocrText.isBlank() ? "" : " Label text: " + ocrText);

                return new HuggingFaceVisionService.VisionResult(
                        name, brand, size, m[0], m[1],
                        bestScore, description);
            }

        } catch (Exception e) {
            throw new IllegalStateException(
                    "YOLO detection failed: " + e.getMessage(), e);
        }
    }

    /** Crop the detected box (+10% padding) from the ORIGINAL image; falls back to full image. */
    private BufferedImage crop(BufferedImage src, float[] box) {
        if (box == null) return shrink(src);

        float sx = src.getWidth() / (float) SIZE;
        float sy = src.getHeight() / (float) SIZE;

        float bw = (box[2] - box[0]) * sx;
        float bh = (box[3] - box[1]) * sy;
        int x1 = (int) Math.floor(box[0] * sx - bw * 0.10f);
        int y1 = (int) Math.floor(box[1] * sy - bh * 0.10f);
        int x2 = (int) Math.ceil(box[2] * sx + bw * 0.10f);
        int y2 = (int) Math.ceil(box[3] * sy + bh * 0.10f);

        x1 = Math.max(0, x1);
        y1 = Math.max(0, y1);
        x2 = Math.min(src.getWidth(), x2);
        y2 = Math.min(src.getHeight(), y2);

        if (x2 - x1 < 32 || y2 - y1 < 32) return shrink(src);

        return shrink(src.getSubimage(x1, y1, x2 - x1, y2 - y1));
    }

    /** Keep the longest side <= 768 px so the upload stays small. */
    private BufferedImage shrink(BufferedImage img) {
        int max = 768;
        int w = img.getWidth(), h = img.getHeight();
        if (Math.max(w, h) <= max) return img;
        float k = max / (float) Math.max(w, h);
        int nw = Math.max(1, Math.round(w * k)), nh = Math.max(1, Math.round(h * k));
        BufferedImage out = new BufferedImage(nw, nh, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(img, 0, 0, nw, nh, null);
        g.dispose();
        return out;
    }

    /** Calls the Python Florence-2 service. Returns null on any failure (scan still works). */
    private JsonNode callOcr(BufferedImage img) {
        try {
            BufferedImage rgb = new BufferedImage(
                    img.getWidth(), img.getHeight(), BufferedImage.TYPE_INT_RGB);
            Graphics2D g = rgb.createGraphics();
            g.drawImage(img, 0, 0, null);
            g.dispose();

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            ImageIO.write(rgb, "jpg", bos);
            String b64 = Base64.getEncoder().encodeToString(bos.toByteArray());

            String json = objectMapper.writeValueAsString(Map.of("image", b64));

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(ocrUrl))
                    .timeout(Duration.ofSeconds(8))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> resp = httpClient.send(
                    req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() / 100 != 2) {
                System.out.println("OCR service HTTP " + resp.statusCode());
                return null;
            }
            return objectMapper.readTree(resp.body());

        } catch (Exception e) {
            System.out.println("OCR service unavailable: " + e.getMessage());
            return null;
        }
    }

    /** Resize to 640x640, RGB, 0..1, CHW. (Only class is needed, so no letterbox.) */
    private float[] preprocess(BufferedImage src) {
        BufferedImage img = new BufferedImage(SIZE, SIZE, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(src, 0, 0, SIZE, SIZE, null);
        g.dispose();

        float[] data = new float[3 * SIZE * SIZE];
        int plane = SIZE * SIZE;
        for (int y = 0; y < SIZE; y++) {
            for (int x = 0; x < SIZE; x++) {
                int rgb = img.getRGB(x, y);
                int i = y * SIZE + x;
                data[i]             = ((rgb >> 16) & 0xFF) / 255f;
                data[plane + i]     = ((rgb >> 8) & 0xFF) / 255f;
                data[2 * plane + i] = (rgb & 0xFF) / 255f;
            }
        }
        return data;
    }
}
