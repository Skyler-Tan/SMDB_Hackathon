package com.threer.seed;

import com.threer.model.CatalogItem;
import com.threer.model.DiyGuide;
import com.threer.repository.CatalogItemRepository;
import com.threer.repository.DiyGuideRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final CatalogItemRepository catalogItemRepository;
    private final DiyGuideRepository diyGuideRepository;

    public DataSeeder(CatalogItemRepository catalogItemRepository, DiyGuideRepository diyGuideRepository) {
        this.catalogItemRepository = catalogItemRepository;
        this.diyGuideRepository = diyGuideRepository;
    }

    @Override
    public void run(String... args) {
        if (catalogItemRepository.count() == 0) {
            catalogItemRepository.saveAll(items());
        }
        if (diyGuideRepository.count() == 0) {
            diyGuideRepository.saveAll(guides());
        }
    }

    private List<CatalogItem> items() {
        return List.of(
                item("plastic-bottle-500", "Plastic bottle (500 ml)", "plastic", true, "plastic",
                        "Empty, rinse, and crush. Caps can usually go in the same plastic bin.",
                        3.0, 0.082, 12, "PET plastic", 15,
                        List.of("bottle"), List.of("pet", "water bottle", "plastic bottle", "soda bottle")),
                item("plastic-bottle-1500", "Plastic bottle (1.5 L)", "plastic", true, "plastic",
                        "Rinse, remove leftover drink, and recycle with plastics.",
                        7.5, 0.21, 32, "PET plastic", 20,
                        List.of(), List.of("1.5l", "large bottle", "family bottle")),
                item("plastic-cup", "Disposable plastic cup", "plastic", true, "plastic",
                        "Clean plastic cups go in the plastic bin. Lined paper cups usually do not.",
                        1.4, 0.04, 8, "PP/PET plastic", 8,
                        List.of("cup"), List.of("plastic cup", "party cup")),
                item("plastic-container", "Plastic food container", "plastic", true, "plastic",
                        "Rinse food residue. Check the recycling number on the base.",
                        5.0, 0.12, 28, "PP plastic", 12,
                        List.of(), List.of("tupperware", "takeaway", "clamshell")),
                item("paper", "Paper / newspaper", "paper", true, "paper",
                        "Keep paper dry and flatten. No greasy pizza boxes on the clean paper stream.",
                        10.0, 0.07, 40, "paper fibre", 10,
                        List.of("book"), List.of("newspaper", "magazine", "office paper", "cardboard")),
                item("cardboard", "Cardboard box", "paper", true, "paper",
                        "Flatten boxes. Remove plastic tape where you can.",
                        18.0, 0.11, 80, "cardboard fibre", 12,
                        List.of(), List.of("box", "carton", "shipping box")),
                item("glass-bottle", "Glass bottle", "glass", true, "glass",
                        "Empty and rinse. Do not bag glass. Lids often go in metal.",
                        2.5, 0.25, 300, "glass", 18,
                        List.of("wine glass", "vase"), List.of("jar", "glass bottle", "beer bottle")),
                item("glass-jar", "Glass jar", "glass", true, "glass",
                        "Rinse. Metal lids usually go in the metal/cans stream.",
                        2.0, 0.18, 220, "glass", 16,
                        List.of("cup", "bowl"), List.of("jam jar", "sauce jar")),
                item("aluminum-can", "Aluminum can", "metal", true, "metal",
                        "Empty and rinse. Cans are infinitely recyclable.",
                        3.5, 0.17, 15, "aluminum", 18,
                        List.of(), List.of("soda can", "tin", "can")),
                item("organic", "Food scraps", "organic", false, "compost",
                        "Not a recycling bin. Compost if you can; otherwise general waste.",
                        0, 0, 0, "organics", 0,
                        List.of("banana", "apple", "orange", "broccoli", "carrot", "sandwich", "pizza", "donut", "cake"),
                        List.of("food", "peel", "leftovers")),
                item("ewaste-phone", "Phone / small electronics", "e-waste", false, "e-waste",
                        "Do not put in household recycling. Take to an e-waste drop-off.",
                        12.0, 8.0, 150, "electronics", 25,
                        List.of("cell phone", "laptop", "keyboard", "mouse", "remote", "tv", "microwave", "toaster", "hair drier"),
                        List.of("phone", "charger", "electronics")),
                item("mixed-unknown", "Mixed / unknown item", "mixed", false, "general",
                        "If you cannot identify the material, use general waste or a reuse DIY instead of guessing a bin.",
                        0, 0, 0, "mixed", 0,
                        List.of("teddy bear", "handbag", "backpack", "umbrella", "chair"),
                        List.of("unknown", "other"))
        );
    }

    private List<DiyGuide> guides() {
        return List.of(
                guide("plastic-pot", "Plastic flower pot", "plastic", "easy",
                        "Turn a bottle into a desk or balcony planter.",
                        "plastic bottle flower pot diy",
                        List.of("scissors", "marker"),
                        List.of("1 empty plastic bottle (500 ml or 1.5 L)", "potting soil", "a small plant or seeds"),
                        List.of(
                                "Rinse the bottle and peel off the label.",
                                "Draw a cut line about one-third from the bottom.",
                                "Cut along the line so the bottom becomes a pot.",
                                "Poke 3–4 drainage holes in the base.",
                                "Fill with soil and plant."
                        )),
                guide("plastic-piggy", "Bottle piggy bank", "plastic", "easy",
                        "A coin bank from a rinsed bottle.",
                        "plastic bottle piggy bank diy",
                        List.of("scissors", "marker", "tape"),
                        List.of("1 empty 1.5 L plastic bottle", "coloured paper or paint (optional)"),
                        List.of(
                                "Rinse and dry the bottle with the cap on.",
                                "Cut a coin slot in the side, wide enough for coins.",
                                "Decorate with paper, tape, or paint.",
                                "Drop coins in the slot; unscrew the cap to empty."
                        )),
                guide("plastic-waterer", "Watering can", "plastic", "easy",
                        "A simple watering can for indoor plants.",
                        "plastic bottle watering can diy",
                        List.of("nail or skewer", "scissors"),
                        List.of("1 empty 1.5 L plastic bottle with cap"),
                        List.of(
                                "Rinse the bottle.",
                                "Heat a nail carefully (adult help) and pierce 6–8 holes in the cap.",
                                "Fill with water, screw the cap on, and squeeze gently to water plants."
                        )),
                guide("plastic-bird", "Bottle bird feeder", "plastic", "medium",
                        "A hanging feeder using a bottle and two spoons.",
                        "plastic bottle bird feeder diy",
                        List.of("scissors", "string", "marker"),
                        List.of("1 empty 1.5 L plastic bottle", "2 wooden spoons or sticks", "bird seed", "string"),
                        List.of(
                                "Rinse and dry the bottle.",
                                "Cut two opposite holes near the bottom for a spoon perch.",
                                "Cut slightly larger holes above so seed can spill onto the spoon.",
                                "Push spoons through. Repeat higher up if you want a second perch.",
                                "Fill with seed, cap the bottle, and hang with string."
                        )),
                guide("plastic-self-water", "Self-watering planter", "plastic", "medium",
                        "A two-part pot that waters plants from a reservoir.",
                        "self watering planter plastic bottle",
                        List.of("scissors", "marker"),
                        List.of("1 empty 1.5 L plastic bottle", "cotton string or yarn", "potting soil", "plant"),
                        List.of(
                                "Cut the bottle in half.",
                                "Flip the top half (neck down) into the bottom half.",
                                "Thread a cotton wick through the cap hole so it hangs into the water reservoir.",
                                "Add soil and a plant in the top half.",
                                "Keep the bottom reservoir filled with water."
                        )),
                guide("plastic-organizer", "Desk organizer", "plastic", "medium",
                        "Cut bottles into cups and glue them as a tidy station.",
                        "plastic bottle desk organizer diy",
                        List.of("scissors", "hot glue gun or strong glue", "marker"),
                        List.of("3 empty plastic bottles", "cardboard base (optional)"),
                        List.of(
                                "Cut bottles to different heights for pens, clips, and scissors.",
                                "Sand or tape raw edges so they are not sharp.",
                                "Glue the cups onto a cardboard base.",
                                "Let the glue set before loading stationery."
                        )),
                guide("plastic-tower", "Vertical garden tower", "plastic", "hard",
                        "Stack bottles into a hanging herb tower.",
                        "vertical garden plastic bottles tower",
                        List.of("scissors", "drill or nail", "rope", "marker"),
                        List.of("6–8 empty 1.5 L plastic bottles", "strong rope", "soil", "herb seedlings"),
                        List.of(
                                "Cut a planting window in the side of each bottle.",
                                "Poke holes in caps and bases so bottles can stack and drain.",
                                "Thread rope through the bottles to hang them in a column.",
                                "Fill with soil and plant herbs in each window.",
                                "Water from the top bottle so it trickles down."
                        )),
                guide("plastic-lamp", "Bottle lantern", "plastic", "hard",
                        "A decorative lantern — use only battery fairy lights, never candles.",
                        "plastic bottle lantern fairy lights diy",
                        List.of("scissors", "craft knife", "tape"),
                        List.of("1 empty 1.5 L clear plastic bottle", "battery fairy lights", "paint or tissue paper"),
                        List.of(
                                "Rinse the bottle and remove the label.",
                                "Cut a small opening near the base to feed lights in.",
                                "Decorate the outside with tissue paper or translucent paint.",
                                "Place battery fairy lights inside. Do not use open flames."
                        )),
                guide("paper-bookmark", "Paper bookmark", "paper", "easy",
                        "A bookmark from scrap paper or a magazine page.",
                        "diy paper bookmark",
                        List.of("scissors", "glue", "ruler"),
                        List.of("1 sheet of scrap paper or magazine page", "optional ribbon"),
                        List.of(
                                "Cut a strip about 4 cm by 18 cm.",
                                "Fold or glue a second layer for stiffness.",
                                "Decorate. Punch a hole and add ribbon if you like."
                        )),
                guide("paper-pot", "Seed starter pots", "paper", "easy",
                        "Newspaper pots you can plant straight into soil.",
                        "newspaper seed starter pots",
                        List.of("scissors", "jar or glass to wrap around"),
                        List.of("newspaper sheets"),
                        List.of(
                                "Cut newspaper into strips.",
                                "Wrap a strip around a jar, fold the bottom in, and slide the jar out.",
                                "Fill with soil and sow seeds. Plant the whole pot later."
                        )),
                guide("paper-organizer", "Magazine file", "paper", "medium",
                        "A desktop file from a cereal box and paper wrap.",
                        "diy cardboard magazine organizer",
                        List.of("scissors", "ruler", "glue", "tape"),
                        List.of("1 cardboard cereal box", "wrapping paper or scrap paper"),
                        List.of(
                                "Cut the box at a diagonal so magazines can slide in.",
                                "Cover with paper using glue.",
                                "Reinforce edges with tape."
                        )),
                guide("paper-papier", "Papier-mâché bowl", "paper", "hard",
                        "A decorative bowl from paper scraps and paste.",
                        "papier mache bowl tutorial",
                        List.of("bowl to use as mould", "paintbrush"),
                        List.of("newspaper or scrap paper", "flour + water paste or craft glue", "paint"),
                        List.of(
                                "Cover a bowl in plastic wrap as a mould.",
                                "Dip paper strips in paste and layer 4–5 coats.",
                                "Dry fully, lift off, and paint."
                        )),
                guide("glass-vase", "Simple glass vase", "glass", "easy",
                        "Reuse a clean jar or bottle as a vase.",
                        "glass jar vase diy",
                        List.of("soap", "optional twine"),
                        List.of("1 clean glass jar or bottle", "twine or ribbon (optional)"),
                        List.of(
                                "Soak and peel the label.",
                                "Wash with soap and dry.",
                                "Wrap twine around the neck if you want a rustic look.",
                                "Add water and flowers."
                        )),
                guide("glass-lantern", "Jar lantern", "glass", "medium",
                        "A hanging lantern — battery tea light only.",
                        "glass jar lantern diy",
                        List.of("wire", "pliers"),
                        List.of("1 glass jar", "battery tea light", "wire for a handle"),
                        List.of(
                                "Clean the jar.",
                                "Wrap wire under the rim to make a handle.",
                                "Drop in a battery tea light. Never use a real candle unattended."
                        )),
                guide("glass-mosaic", "Bottle mosaic coaster", "glass", "hard",
                        "Only with adult help — glass shards are sharp.",
                        "glass mosaic coaster diy",
                        List.of("safety gloves", "eye protection", "tile adhesive", "grout"),
                        List.of("broken coloured glass (or glass gems)", "plain ceramic tile"),
                        List.of(
                                "Wear gloves and eye protection.",
                                "Arrange glass pieces on a tile.",
                                "Glue, grout, and wipe clean. Sand sharp edges."
                        )),
                guide("metal-planter", "Tin can planter", "metal", "easy",
                        "A small herb pot from a rinsed can.",
                        "tin can planter diy",
                        List.of("nail", "hammer", "sandpaper"),
                        List.of("1 clean aluminum or steel can", "soil", "herb seedling"),
                        List.of(
                                "Rinse the can and sand any sharp rim.",
                                "Punch drainage holes in the base.",
                                "Paint if you like, then add soil and a plant."
                        )),
                guide("metal-organizer", "Can desk cups", "metal", "medium",
                        "Painted cans for pens and brushes.",
                        "tin can organizer diy",
                        List.of("sandpaper", "paintbrush", "glue"),
                        List.of("2–3 clean cans", "paint", "wooden board (optional)"),
                        List.of(
                                "Sand rims smooth.",
                                "Paint and let dry.",
                                "Glue onto a board as a set."
                        )),
                guide("metal-wind", "Can wind chime", "metal", "hard",
                        "A garden chime from several cans.",
                        "tin can wind chime diy",
                        List.of("hammer", "nail", "string"),
                        List.of("4–6 clean cans", "string", "a stick or hanger"),
                        List.of(
                                "Punch a hole in each can base.",
                                "Tie cans at different lengths on a stick.",
                                "Hang outside where they can tap gently."
                        ))
        );
    }

    private CatalogItem item(
            String id,
            String name,
            String material,
            boolean recyclable,
            String bin,
            String notes,
            double water,
            double co2,
            double grams,
            String materialLabel,
            int points,
            List<String> coco,
            List<String> aliases) {
        CatalogItem item = new CatalogItem();
        item.setId(id);
        item.setName(name);
        item.setMaterial(material);
        item.setRecyclable(recyclable);
        item.setBin(bin);
        item.setNotes(notes);
        item.setWaterLiters(water);
        item.setCo2Kg(co2);
        item.setMaterialGrams(grams);
        item.setMaterialLabel(materialLabel);
        item.setRewardPoints(points);
        item.setCocoLabels(coco);
        item.setAliases(aliases);
        return item;
    }

    private DiyGuide guide(
            String id,
            String title,
            String material,
            String difficulty,
            String summary,
            String youtubeSearch,
            List<String> tools,
            List<String> materials,
            List<String> steps) {
        DiyGuide guide = new DiyGuide();
        guide.setId(id);
        guide.setTitle(title);
        guide.setMaterial(material);
        guide.setDifficulty(difficulty);
        guide.setSummary(summary);
        guide.setYoutubeSearch(youtubeSearch);
        guide.setTools(tools);
        guide.setMaterials(materials);
        guide.setSteps(steps);
        return guide;
    }
}
