import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { loadFromSupabase, saveToSupabase, subscribeToUpdates, isDMAuthenticated, authenticateDM, clearDMSession, uploadImage, deleteImage } from './storage.js';
import { Search, Book, Users, Sword, Shield, Sparkles, ScrollText, Edit3, Plus, X, Save, ChevronRight, Home, Skull, Eye, Trash2, Image as ImageIcon, Upload } from 'lucide-react';

// ============================================================
// DEFAULT CONTENT — seeded from Mikey's homebrew documents
// ============================================================
const DEFAULT_CONTENT = {
  meta: {
    title: "Chronicles of the Realms",
    subtitle: "A Homebrew Compendium",
    version: "1.0",
  },
  campaign: {
    overview: `The Chronicles of the Realms is a D&D 5.5e homebrew campaign set against the looming usurpation of the death domain. Hades, having seized the role from the rightful deity Morterra, conscripts the souls of fallen adventurers as his generals.

The player characters — NEXUS, a redemption-bound Conduit of Life sworn to Lathander, and Glass of Dusk, a LyCara Ranger once enthralled by Hades and now freed — stand at the center of this cosmic upheaval.`,
    keyFigures: [
      { name: "Morterra", role: "The rightful deity of death, displaced by Hades' usurpation." },
      { name: "Hades", role: "Usurper of the death domain. Wields dead adventurers' souls as generals." },
      { name: "Lathander", role: "God of dawn and renewal. NEXUS's patron." },
    ],
  },
  // Define the canonical ordering of race "families" for the sidebar.
  // C.O.L. is the campaign-custom race; the rest are from races_noimgs.pdf in document order.
  raceOrder: [
    "Conduit of Life",
    "Varnok", "Echoborn", "LyCara", "Vekkens", "Solari", "Heldums",
    "Asarin", "Raka", "Malakar", "Tauren", "Dracolytes", "Dhampir", "Crocothians",
    "Salamandras", "Gildra'Tené", "Tasuma", "Storden",
    "Thornara", "Onikara", "Heiralis", "Venira", "Mournir", "Aerothel",
    "Kyith'Kin", "Crivans", "Astravori", "Littorins", "Oro'Kong",
  ],
  races: [
    // ============ CONDUIT OF LIFE ============
    {
      id: "col",
      name: "Conduit of Life",
      parentRace: "Conduit of Life",
      isParent: true,
      tagline: "Bioarcane vessels — flesh and arcana woven into one.",
      description: "Conduits of Life are living lattices of biology and arcane circuitry, designed as vessels for a specific class archetype. Each C.O.L. is tuned at conception, gaining proficiencies and innate features that align with one martial or magical tradition.",
      traits: [
        { name: "Ability Scores", text: "+2 to one score, +1 to another, OR +1 to three different scores." },
        { name: "Size", text: "Medium." },
        { name: "Speed", text: "30 feet." },
        { name: "Bioarcane Resilience", text: "You have advantage on saving throws against being poisoned, and resistance to poison damage." },
        { name: "Class Tuning", text: "At character creation, choose a class archetype (see C.O.L. archetypes). You gain the listed features for that tuning." },
      ],
      archetypes: [
        { name: "Reactive Core (Artificer)", text: "Cast Identify and Mending at will, Magic Weapon once per long rest. Tinker's and Smith's tools proficiency. Reactive Slot Matrix: when reacting to activate a magical item, move 5 ft without provoking OAs." },
        { name: "Bloodcore (Barbarian)", text: "While raging, gain temp HP equal to CON mod at start of turn. Count as one size larger for carry capacity. Once/long rest, reduce a crit against you to a normal hit." },
        { name: "Harmonist (Bard)", text: "Cast Dissonant Whispers once/long rest. Voice of Crystal: advantage on Performance involving voice." },
        { name: "Warbound (Fighter)", text: "Add INT mod (min +1) to Initiative. Once/short rest, take one extra attack on Attack action. Reaction: reduce damage taken by PROF + CON mod." },
        { name: "Flow-Weft (Monk)", text: "Unarmed strikes count as magical. Step of the Wind triples jump distance and grants vertical movement that turn." },
        { name: "Spellweave (Wizard)", text: "On casting a 1st-lvl Wizard spell, reaction: gain temp HP equal to spell level + INT mod. Crystalline Recall: always have one chosen 1st-level Wizard spell prepared free. Advantage on concentration saves." },
      ],
      note: "",
    },

    // ============ VARNOK ============
    { id: "varnok", name: "Varnok", parentRace: "Varnok", isParent: true, tagline: "Hovering aberrant kin of forgotten beholders.", description: "", traits: [], note: "" },
    { id: "eyeblight-spawn", name: "Eyeblight Spawn", parentRace: "Varnok", summary: "", traits: [], note: "" },
    { id: "mawborn-tyrant", name: "Mawborn Tyrant", parentRace: "Varnok", summary: "", traits: [], note: "" },
    { id: "dreamseer-kin", name: "Dreamseer Kin", parentRace: "Varnok", summary: "", traits: [], note: "" },

    // ============ ECHOBORN ============
    { id: "echoborn", name: "Echoborn", parentRace: "Echoborn", isParent: true, tagline: "", description: "", traits: [], note: "" },
    { id: "voruborn", name: "Voruborn", parentRace: "Echoborn", summary: "", traits: [], note: "" },
    { id: "phreniborn", name: "Phreniborn", parentRace: "Echoborn", summary: "", traits: [], note: "" },
    { id: "tentacari", name: "Tentacari", parentRace: "Echoborn", summary: "", traits: [], note: "" },

    // ============ LYCARA ============
    {
      id: "lycara",
      name: "LyCara",
      parentRace: "LyCara",
      isParent: true,
      tagline: "Lupine-touched wanderers between dusk and moonlight.",
      description: "LyCara are a lycanthropy-derived lineage that walks the line between human composure and bestial instinct. Glass of Dusk is the campaign's notable LyCara — once enthralled to Hades, now redeemed.",
      traits: [
        { name: "Ability Scores", text: "+2 DEX, +1 WIS (or per modern D&D 5.5e rules, +2/+1 of choice)." },
        { name: "Size", text: "Medium." },
        { name: "Speed", text: "35 feet." },
        { name: "Keen Senses", text: "Proficiency in Perception. Advantage on Perception checks relying on smell or hearing." },
        { name: "Lunar Resonance", text: "While under direct moonlight, you have advantage on saving throws against being charmed or frightened." },
        { name: "Predator's Step", text: "Once per short rest, you can use a bonus action to move up to your speed without provoking opportunity attacks." },
      ],
    },
    { id: "moonlit-wolfkin", name: "Moonlit Wolfkin", parentRace: "LyCara", summary: "", traits: [], note: "" },
    { id: "shadowed-howler", name: "Shadowed Howler", parentRace: "LyCara", summary: "", traits: [], note: "" },
    { id: "sunlit-guardian", name: "Sunlit Guardian", parentRace: "LyCara", summary: "", traits: [], note: "" },
    { id: "frostborn-tracker", name: "Frostborn Tracker", parentRace: "LyCara", summary: "", traits: [], note: "" },

    // ============ VEKKENS ============
    { id: "vekkens", name: "Vekkens", parentRace: "Vekkens", isParent: true, tagline: "", description: "", traits: [], note: "" },
    { id: "veken-titans", name: "Veken Titans", parentRace: "Vekkens", summary: "", traits: [], note: "" },
    { id: "veken-heroes", name: "Veken Heroes", parentRace: "Vekkens", summary: "", traits: [], note: "" },
    { id: "veken-warriors", name: "Veken Warriors", parentRace: "Vekkens", summary: "", traits: [], note: "" },
    { id: "pureblood-vekens", name: "Pureblood Vekens", parentRace: "Vekkens", summary: "", traits: [], note: "" },

    // ============ SOLARI ============
    { id: "solari", name: "Solari", parentRace: "Solari", isParent: true, tagline: "", description: "", traits: [], note: "" },
    { id: "sunborn-solari", name: "Sunborn Solari", parentRace: "Solari", summary: "", traits: [], note: "" },
    { id: "moonborn-solari", name: "Moonborn Solari", parentRace: "Solari", summary: "", traits: [], note: "" },
    { id: "starlit-solari", name: "Starlit Solari", parentRace: "Solari", summary: "", traits: [], note: "" },

    // ============ HELDUMS ============
    { id: "heldums", name: "Heldums", parentRace: "Heldums", isParent: true, tagline: "", description: "", traits: [], note: "" },
    { id: "pyronite-heldum", name: "Pyronite Heldum", parentRace: "Heldums", summary: "", traits: [], note: "" },
    { id: "veilborn-heldum", name: "Veilborn Heldum", parentRace: "Heldums", summary: "", traits: [], note: "" },
    { id: "runevein-heldum", name: "Runevein Heldum", parentRace: "Heldums", summary: "", traits: [], note: "" },
    { id: "titanforged-heldum", name: "Titanforged Heldum", parentRace: "Heldums", summary: "", traits: [], note: "" },
    { id: "luminarch-heldum", name: "Luminarch Heldum", parentRace: "Heldums", summary: "", traits: [], note: "" },

    // ============ ASARIN ============
    { id: "asarin", name: "Asarin", parentRace: "Asarin", isParent: true, tagline: "Lion-blooded prides of the savanna.", description: "", traits: [], note: "" },
    { id: "swiftmanes", name: "Swiftmanes", parentRace: "Asarin", summary: "", traits: [], note: "" },
    { id: "moonmanes", name: "Moonmanes", parentRace: "Asarin", summary: "", traits: [], note: "" },
    { id: "nightmanes", name: "Nightmanes", parentRace: "Asarin", summary: "", traits: [], note: "" },
    { id: "sunmanes", name: "Sunmanes", parentRace: "Asarin", summary: "", traits: [], note: "" },

    // ============ RAKA ============
    { id: "raka", name: "Raka", parentRace: "Raka", isParent: true, tagline: "Tiger-spirit kin.", description: "", traits: [], note: "" },
    { id: "blackstripe-raka", name: "Blackstripe Raka", parentRace: "Raka", summary: "Black fur with orange stripes.", traits: [], note: "" },
    { id: "snowstripe-raka", name: "Snowstripe Raka", parentRace: "Raka", summary: "White fur with black stripes.", traits: [], note: "" },
    { id: "flamestripe-raka", name: "Flamestripe Raka", parentRace: "Raka", summary: "Orange fur with black stripes.", traits: [], note: "" },

    // ============ MALAKAR ============
    { id: "malakar", name: "Malakar", parentRace: "Malakar", isParent: true, tagline: "", description: "", traits: [], note: "" },
    { id: "flameborn-malakar", name: "Flameborn Malakar", parentRace: "Malakar", summary: "", traits: [], note: "" },
    { id: "ironclad-malakar", name: "Ironclad Malakar", parentRace: "Malakar", summary: "", traits: [], note: "" },
    { id: "tempestborn-malakar", name: "Tempestborn Malakar", parentRace: "Malakar", summary: "", traits: [], note: "" },

    // ============ TAUREN ============
    { id: "tauren", name: "Tauren", parentRace: "Tauren", isParent: true, tagline: "Horned bovine kin.", description: "", traits: [], note: "" },
    { id: "mountain-tauren", name: "Mountain Tauren", parentRace: "Tauren", summary: "", traits: [], note: "" },
    { id: "forest-tauren", name: "Forest Tauren", parentRace: "Tauren", summary: "", traits: [], note: "" },
    { id: "feyblood-tauren", name: "Feyblood Tauren", parentRace: "Tauren", summary: "", traits: [], note: "" },

    // ============ DRACOLYTES ============
    { id: "dracolytes", name: "Dracolytes", parentRace: "Dracolytes", isParent: true, tagline: "Draconic-blooded heralds.", description: "Subraces are organized by chromatic and metallic dragon ancestry.", traits: [], note: "" },
    { id: "red-dracolyte", name: "Red Dracolyte", parentRace: "Dracolytes", summary: "Fire damage type.", traits: [], note: "" },
    { id: "blue-dracolyte", name: "Blue Dracolyte", parentRace: "Dracolytes", summary: "Lightning damage type.", traits: [], note: "" },
    { id: "green-dracolyte", name: "Green Dracolyte", parentRace: "Dracolytes", summary: "Poison damage type.", traits: [], note: "" },
    { id: "black-dracolyte", name: "Black Dracolyte", parentRace: "Dracolytes", summary: "Acid damage type.", traits: [], note: "" },
    { id: "white-dracolyte", name: "White Dracolyte", parentRace: "Dracolytes", summary: "Cold damage type.", traits: [], note: "" },
    { id: "gold-dracolyte", name: "Gold Dracolyte", parentRace: "Dracolytes", summary: "Fire damage type.", traits: [], note: "" },
    { id: "silver-dracolyte", name: "Silver Dracolyte", parentRace: "Dracolytes", summary: "Cold damage type.", traits: [], note: "" },
    { id: "bronze-dracolyte", name: "Bronze Dracolyte", parentRace: "Dracolytes", summary: "Lightning damage type.", traits: [], note: "" },
    { id: "brass-dracolyte", name: "Brass Dracolyte", parentRace: "Dracolytes", summary: "Fire damage type.", traits: [], note: "" },
    { id: "copper-dracolyte", name: "Copper Dracolyte", parentRace: "Dracolytes", summary: "Acid damage type.", traits: [], note: "" },

    // ============ DHAMPIR ============
    { id: "dhampir", name: "Dhampir", parentRace: "Dhampir", isParent: true, tagline: "Halfblood heirs of vampiric lineage.", description: "", traits: [], note: "" },
    { id: "daywalker-dhampir", name: "Daywalker Dhampir", parentRace: "Dhampir", summary: "", traits: [], note: "" },
    { id: "nightborn-dhampir", name: "Nightborn Dhampir", parentRace: "Dhampir", summary: "", traits: [], note: "" },
    { id: "pureblood-dhampir", name: "Pureblood Dhampir", parentRace: "Dhampir", summary: "", traits: [], note: "" },

    // ============ CROCOTHIANS ============
    { id: "crocothians", name: "Crocothians", parentRace: "Crocothians", isParent: true, tagline: "Crocodilian warriors of river and stone.", description: "", traits: [], note: "" },
    { id: "marshjaw-crocothian", name: "Marshjaw Crocothian", parentRace: "Crocothians", summary: "", traits: [], note: "" },
    { id: "riverfang-crocothian", name: "Riverfang Crocothian", parentRace: "Crocothians", summary: "", traits: [], note: "" },
    { id: "stonehide-crocothian", name: "Stonehide Crocothian", parentRace: "Crocothians", summary: "", traits: [], note: "" },

    // ============ SALAMANDRAS ============
    { id: "salamandras", name: "Salamandras", parentRace: "Salamandras", isParent: true, tagline: "Underdark-adapted salamander folk.", description: "", traits: [], note: "" },
    { id: "acidfang-salamandras", name: "Acidfang Salamandras", parentRace: "Salamandras", summary: "", traits: [], note: "" },
    { id: "glowveil-salamandras", name: "Glowveil Salamandras", parentRace: "Salamandras", summary: "", traits: [], note: "" },
    { id: "riverrush-salamandras", name: "Riverrush Salamandras", parentRace: "Salamandras", summary: "", traits: [], note: "" },

    // ============ GILDRA'TENÉ ============
    { id: "gildratene", name: "Gildra'Tené", parentRace: "Gildra'Tené", isParent: true, tagline: "", description: "", traits: [], note: "Subrace section in the source doc is also labeled 'Cis'Culiun Subraces' — possibly an alternate name for the same lineage." },
    { id: "onyx-clan", name: "Onyx Clan", parentRace: "Gildra'Tené", summary: "", traits: [], note: "" },
    { id: "azure-clan", name: "Azure Clan", parentRace: "Gildra'Tené", summary: "", traits: [], note: "" },
    { id: "slate-clan", name: "Slate Clan", parentRace: "Gildra'Tené", summary: "", traits: [], note: "" },

    // ============ TASUMA ============
    { id: "tasuma", name: "Tasuma", parentRace: "Tasuma", isParent: true, tagline: "Flame-blooded scions.", description: "", traits: [], note: "" },
    { id: "emberborn", name: "Emberborn", parentRace: "Tasuma", summary: "", traits: [], note: "" },
    { id: "ashenwings", name: "Ashenwings", parentRace: "Tasuma", summary: "", traits: [], note: "" },
    { id: "magmablood", name: "Magmablood", parentRace: "Tasuma", summary: "", traits: [], note: "" },
    { id: "pyrokin", name: "Pyrokin", parentRace: "Tasuma", summary: "", traits: [], note: "" },

    // ============ STORDEN ============
    { id: "storden", name: "Storden", parentRace: "Storden", isParent: true, tagline: "Giant-blooded juggernauts of the Underdark.", description: "Ultimate descendants of true giants, each Storden inherits the primal destruction of a specific giant lineage.", traits: [], note: "" },
    { id: "frostborn-storden", name: "Frostborn Storden", parentRace: "Storden", summary: "", traits: [], note: "" },
    { id: "infernal-storden", name: "Infernal Storden", parentRace: "Storden", summary: "", traits: [], note: "" },
    { id: "stoneborn-storden", name: "Stoneborn Storden", parentRace: "Storden", summary: "", traits: [], note: "" },
    { id: "stormborn-storden", name: "Stormborn Storden", parentRace: "Storden", summary: "", traits: [], note: "" },
    { id: "skyborn-storden", name: "Skyborn Storden", parentRace: "Storden", summary: "", traits: [], note: "" },
    { id: "hillborn-storden", name: "Hillborn Storden", parentRace: "Storden", summary: "", traits: [], note: "" },

    // ============ THORNARA ============
    { id: "thornara", name: "Thornara", parentRace: "Thornara", isParent: true, tagline: "Plant-folk of root and bloom.", description: "", traits: [], note: "" },
    { id: "oakheart-thornara", name: "Oakheart Thornara", parentRace: "Thornara", summary: "", traits: [], note: "" },
    { id: "willowspirit-thornara", name: "Willowspirit Thornara", parentRace: "Thornara", summary: "", traits: [], note: "" },
    { id: "roseblood-thornara", name: "Roseblood Thornara", parentRace: "Thornara", summary: "", traits: [], note: "" },

    // ============ ONIKARA ============
    { id: "onikara", name: "Onikara", parentRace: "Onikara", isParent: true, tagline: "Half-Oni warriors and shadow-walkers.", description: "", traits: [], note: "" },
    { id: "onikara-frost", name: "Onikara (Frost)", parentRace: "Onikara", summary: "", traits: [], note: "" },
    { id: "onikara-storm", name: "Onikara (Storm)", parentRace: "Onikara", summary: "", traits: [], note: "" },
    { id: "onikara-shadow", name: "Onikara (Shadow)", parentRace: "Onikara", summary: "", traits: [], note: "" },

    // ============ HEIRALIS ============
    { id: "heiralis", name: "Heiralis", parentRace: "Heiralis", isParent: true, tagline: "Empyrean-blooded scions.", description: "", traits: [], note: "" },
    { id: "heiralis-life", name: "Heiralis (Life)", parentRace: "Heiralis", summary: "", traits: [], note: "" },
    { id: "heiralis-war", name: "Heiralis (War)", parentRace: "Heiralis", summary: "", traits: [], note: "" },
    { id: "heiralis-light", name: "Heiralis (Light)", parentRace: "Heiralis", summary: "", traits: [], note: "" },

    // ============ VENIRA ============
    { id: "venira", name: "Venira", parentRace: "Venira", isParent: true, tagline: "", description: "", traits: [], note: "Subraces marked as Optional in the source doc." },
    { id: "venira-venom", name: "Venira (Venom)", parentRace: "Venira", summary: "", traits: [], note: "" },
    { id: "venira-sands", name: "Venira (Sands)", parentRace: "Venira", summary: "", traits: [], note: "" },
    { id: "venira-oracle", name: "Venira (Oracle)", parentRace: "Venira", summary: "", traits: [], note: "" },

    // ============ MOURNIR ============
    { id: "mournir", name: "Mournir", parentRace: "Mournir", isParent: true, tagline: "Wight-touched kin between life and undeath.", description: "", traits: [], note: "Subraces marked as Optional in the source doc." },
    { id: "mournir-dread", name: "Mournir (Dread)", parentRace: "Mournir", summary: "", traits: [], note: "" },
    { id: "mournir-graveborn", name: "Mournir (Graveborn)", parentRace: "Mournir", summary: "", traits: [], note: "" },
    { id: "mournir-soulbound", name: "Mournir (Soulbound)", parentRace: "Mournir", summary: "", traits: [], note: "" },

    // ============ AEROTHEL ============
    { id: "aerothel", name: "Aerothel", parentRace: "Aerothel", isParent: true, tagline: "Elementally-attuned skybound kin.", description: "Subraces are differentiated by Elemental Affinity.", traits: [], note: "" },
    { id: "aerothel-fire", name: "Aerothel of Fire", parentRace: "Aerothel", summary: "", traits: [], note: "" },
    { id: "aerothel-air", name: "Aerothel of Air", parentRace: "Aerothel", summary: "", traits: [], note: "" },
    { id: "aerothel-water", name: "Aerothel of Water", parentRace: "Aerothel", summary: "", traits: [], note: "" },
    { id: "aerothel-earth", name: "Aerothel of Earth", parentRace: "Aerothel", summary: "", traits: [], note: "" },
    { id: "aerothel-lightning", name: "Aerothel of Lightning", parentRace: "Aerothel", summary: "", traits: [], note: "" },

    // ============ KYITH'KIN ============
    { id: "kyithkin", name: "Kyith'Kin", parentRace: "Kyith'Kin", isParent: true, tagline: "Lathander-blessed of elemental balance.", description: "Subraces are differentiated by Elemental Blessing.", traits: [], note: "" },
    { id: "kyithkin-fire", name: "Fire Blessed", parentRace: "Kyith'Kin", summary: "Kyith's burning passion and desire for justice.", traits: [], note: "" },
    { id: "kyithkin-earth", name: "Earth Blessed", parentRace: "Kyith'Kin", summary: "Kyith's steady and firm morals.", traits: [], note: "" },
    { id: "kyithkin-water", name: "Water Blessed", parentRace: "Kyith'Kin", summary: "", traits: [], note: "" },
    { id: "kyithkin-air", name: "Air Blessed", parentRace: "Kyith'Kin", summary: "", traits: [], note: "" },

    // ============ CRIVANS ============
    { id: "crivans", name: "Crivans", parentRace: "Crivans", isParent: true, tagline: "", description: "", traits: [], note: "" },
    { id: "sandweaver-criva", name: "Sandweaver Criva", parentRace: "Crivans", summary: "", traits: [], note: "" },
    { id: "historian-criva", name: "Historian Criva", parentRace: "Crivans", summary: "", traits: [], note: "" },
    { id: "songkeeper-criva", name: "Songkeeper Criva", parentRace: "Crivans", summary: "", traits: [], note: "" },
    { id: "strengthbinder-criva", name: "Strengthbinder Criva", parentRace: "Crivans", summary: "", traits: [], note: "" },

    // ============ ASTRAVORI ============
    { id: "astravori", name: "Astravori", parentRace: "Astravori", isParent: true, tagline: "", description: "", traits: [], note: "" },
    { id: "lumindral", name: "Lumindral", parentRace: "Astravori", summary: "", traits: [], note: "" },
    { id: "gravir", name: "Gravir", parentRace: "Astravori", summary: "", traits: [], note: "" },
    { id: "veythra", name: "Veythra", parentRace: "Astravori", summary: "", traits: [], note: "" },
    { id: "umbrathis", name: "Umbrathis", parentRace: "Astravori", summary: "", traits: [], note: "" },

    // ============ LITTORINS ============
    { id: "littorins", name: "Littorins", parentRace: "Littorins", isParent: true, tagline: "Shore-dwelling kin of varied waterways.", description: "", traits: [], note: "" },
    { id: "tidewalker", name: "Tidewalker", parentRace: "Littorins", summary: "Ocean Shores.", traits: [], note: "" },
    { id: "riverweaver", name: "Riverweaver", parentRace: "Littorins", summary: "Riverbanks.", traits: [], note: "" },
    { id: "mirelurker", name: "Mirelurker", parentRace: "Littorins", summary: "Swamp Shores.", traits: [], note: "" },
    { id: "brineclaw", name: "Brineclaw", parentRace: "Littorins", summary: "Lake Shores.", traits: [], note: "" },

    // ============ ORO'KONG ============
    { id: "orokong", name: "Oro'Kong", parentRace: "Oro'Kong", isParent: true, tagline: "Powerful primate kin of mountain, cave, and forest tribes.", description: "", traits: [], note: "" },
    { id: "mountain-orokong", name: "Mountain Tribe Oro'Kong", parentRace: "Oro'Kong", summary: "White fur, blue eyes. Natural climbers with cold resistance.", traits: [], note: "" },
    { id: "cave-orokong", name: "Cave Tribe Oro'Kong", parentRace: "Oro'Kong", summary: "Gray fur, red eyes. Darkvision 120 ft, echo location.", traits: [], note: "" },
    { id: "forest-orokong", name: "Forest Tribe Oro'Kong", parentRace: "Oro'Kong", summary: "Black fur, brown eyes. Natural stealth, arboreal agility.", traits: [], note: "" },
  ],
  classes: [
    // ── ESPER (full) ──────────────────────────────────────────────────────────
    {
      id: "esper", name: "Esper", primary: "Intelligence", hitDie: "d6",
      startingHP: "6 + CON modifier",
      hpPerLevel: "4 + CON modifier per level after 1st",
      armorTraining: "Light Armor",
      savingThrows: "Intelligence, Wisdom",
      skills: "Choose 2: Sleight of Hand, Stealth, Psionics, History, Insight, Persuasion",
      weapons: "Simple Weapons",
      startingEquipment: "See Esper class doc.",
      summary: "The formidable minds of Espers manifest in psionic abilities — surreal yet beautiful, subtle but deadly. Innately influential to Alptorum, the dimension of mind, Espers are both subject to and sovereign over powers and truths inconceivable to common folk.",
      tableColumns: ["Level","Talents","TP","ESP Die","Features"],
      coreFeatures: [
        { level: 1, name: "Psionic Ability", text: "ESP Dice scale (1d6 → 1d8 at 5th → 1d10 at 11th → 1d12 at 17th). Thought Points = Esper level, regained on long rest; bonus action to regain 1 (recharges on short/long rest). ESP Save DC = 8 + PB + INT mod." },
        { level: 1, name: "Extrasensory Perception", text: "Proficiency in Perception. Telepathy (30 ft, language required). Clairvoyance (see/hear/smell through a creature's senses within 30 ft for 1 minute, or 1 TP for 600 ft sight-only)." },
        { level: 2, name: "Supersensory Stimulus", text: "Telekinesis (BA, 5×level lbs at 30 ft; shove for 1 ESP die force + 5 ft push). Levitation (BA, hover at full speed; 1 TP for a 30-ft floating field for allies)." },
        { level: 2, name: "Preternatural Talents", text: "Gain talents per the Esper Table. Multiclass talents available with prerequisite levels in both Esper and the partner class." },
        { level: 3, name: "Esper Sect", text: "Choose: Deity Nightmare, Eye of Eternity, Psionic Executioner, Order of the Mender, Mind Ravager, or The Hidden Hand." },
        { level: 4, name: "Repulse Reality", text: "Reaction: when hit by an attack dealing B/P/S damage, reduce damage by 1d10 + INT mod + Esper level." },
        { level: 5, name: "Contemplation", text: "BA: spend 1 TP to regain HP equal to 1 ESP Die + CON mod. Short rest restores TP equal to PB." },
        { level: 7, name: "Mental Pavise", text: "Psychic resistance. Immune to charmed/frightened. Thoughts cannot be read against your will." },
        { level: 11, name: "Total Acumen", text: "Your psionic mastery deepens — see class doc for full text." },
        { level: 15, name: "Immutable", text: "Mind and self are unshakeable at the highest tier." },
        { level: 20, name: "Consummate Mind", text: "Capstone — the Esper's potential fully realized." },
      ],
      progression: [
        { level: 1,  col2: "—",  col3: 1,  col4: "d6",  features: "Psionic Ability, Extrasensory Perception" },
        { level: 2,  col2: 2,    col3: 2,  col4: "d6",  features: "Supersensory Stimulus, Preternatural Talents" },
        { level: 3,  col2: 3,    col3: 3,  col4: "d6",  features: "Esper Sect" },
        { level: 4,  col2: 3,    col3: 4,  col4: "d6",  features: "ASI, Repulse Reality" },
        { level: 5,  col2: 4,    col3: 5,  col4: "d8",  features: "Contemplation, Extrasensory Improvement" },
        { level: 6,  col2: 4,    col3: 6,  col4: "d8",  features: "Sect Feature" },
        { level: 7,  col2: 5,    col3: 7,  col4: "d8",  features: "Mental Pavise" },
        { level: 8,  col2: 5,    col3: 8,  col4: "d8",  features: "ASI" },
        { level: 9,  col2: 6,    col3: 9,  col4: "d8",  features: "Supersensory Improvement" },
        { level: 10, col2: 6,    col3: 10, col4: "d8",  features: "Sect Feature" },
        { level: 11, col2: 7,    col3: 11, col4: "d10", features: "Total Acumen" },
        { level: 12, col2: 7,    col3: 12, col4: "d10", features: "ASI" },
        { level: 13, col2: 8,    col3: 13, col4: "d10", features: "Extrasensory Mastery" },
        { level: 14, col2: 8,    col3: 14, col4: "d10", features: "Sect Feature, True Cryptaesthesia" },
        { level: 15, col2: 9,    col3: 15, col4: "d10", features: "Immutable" },
        { level: 16, col2: 9,    col3: 16, col4: "d10", features: "ASI" },
        { level: 17, col2: 10,   col3: 17, col4: "d12", features: "—" },
        { level: 18, col2: 10,   col3: 18, col4: "d12", features: "Sect Feature, Supersensory Mastery" },
        { level: 19, col2: 11,   col3: 19, col4: "d12", features: "Epic Boon, As Within So Without" },
        { level: 20, col2: 11,   col3: 20, col4: "d12", features: "Consummate Mind" },
      ],
    },
    // ── RANGER (CotR Rewrite) ─────────────────────────────────────────────────
    {
      id: "ranger", name: "Ranger (CotR Rewrite)", primary: "Dexterity / Wisdom", hitDie: "d10",
      startingHP: "10 + CON modifier",
      hpPerLevel: "6 + CON modifier per level after 1st",
      armorTraining: "Light Armor, Medium Armor, Shields",
      savingThrows: "Strength, Dexterity",
      skills: "See full Ranger doc",
      weapons: "Simple and Martial Weapons",
      startingEquipment: "See full Ranger doc.",
      summary: "The CotR Ranger is a comprehensive rewrite balancing the class as a top-tier martial-magical hybrid. Notable additions: Apex Dread (6th), upgraded Apex Dread (13th), reworked Tenacity (17th), expanded Prowess (18th) with truesight-on-mark. The Patience mechanic is balanced around its action cost + repositioning benefit + charge-stacking.",
      tableColumns: ["Level","Spells Known","Spell Slots","Slot Level","Features"],
      coreFeatures: [
        { level: 1, name: "Favored Enemy / Marksmanship", text: "See full Ranger document for current 5.5e CotR feature list." },
        { level: 6, name: "Apex Dread", text: "New mid-tier feature filling the previous level-6 dead zone — strikes fear into marked targets." },
        { level: 13, name: "Apex Dread (Upgraded)", text: "Upgraded form of Apex Dread." },
        { level: 17, name: "Tenacity (Reworked)", text: "Reworked endurance feature." },
        { level: 18, name: "Prowess (Expanded)", text: "Expanded with truesight against marked targets." },
      ],
      progression: [],
      notes: "Full feature list in COTR_Ranger_Final.docx.",
    },
    // ── ARTIFICER ─────────────────────────────────────────────────────────────
    {
      id: "artificer", name: "Artificer", primary: "Intelligence", hitDie: "d8",
      startingHP: "8 + CON modifier",
      hpPerLevel: "5 + CON modifier per level after 1st",
      armorTraining: "Light Armor, Medium Armor, Shields",
      savingThrows: "Constitution, Intelligence",
      skills: "",
      weapons: "Simple Weapons, Hand Crossbows, Heavy Crossbows",
      startingEquipment: "",
      summary: "",
      tableColumns: ["Level","Infusions Known","Infused Items","Spell Slots","Features"],
      coreFeatures: [],
      progression: [],
    },
    // ── BARBARIAN ─────────────────────────────────────────────────────────────
    {
      id: "barbarian", name: "Barbarian", primary: "Strength", hitDie: "d12",
      startingHP: "12 + CON modifier",
      hpPerLevel: "7 + CON modifier per level after 1st",
      armorTraining: "Light Armor, Medium Armor, Shields",
      savingThrows: "Strength, Constitution",
      skills: "",
      weapons: "Simple and Martial Weapons",
      startingEquipment: "",
      summary: "",
      tableColumns: ["Level","Rages","Rage Damage","Features"],
      coreFeatures: [],
      progression: [],
    },
    // ── BARD ──────────────────────────────────────────────────────────────────
    {
      id: "bard", name: "Bard", primary: "Charisma", hitDie: "d8",
      startingHP: "8 + CON modifier",
      hpPerLevel: "5 + CON modifier per level after 1st",
      armorTraining: "Light Armor",
      savingThrows: "Dexterity, Charisma",
      skills: "",
      weapons: "Simple Weapons, Hand Crossbows, Longswords, Rapiers, Shortswords",
      startingEquipment: "",
      summary: "",
      tableColumns: ["Level","Bardic Inspiration","Cantrips","Spells Known","Spell Slots","Features"],
      coreFeatures: [],
      progression: [],
    },
    // ── CLERIC ────────────────────────────────────────────────────────────────
    {
      id: "cleric", name: "Cleric", primary: "Wisdom", hitDie: "d8",
      startingHP: "8 + CON modifier",
      hpPerLevel: "5 + CON modifier per level after 1st",
      armorTraining: "Light Armor, Medium Armor, Shields",
      savingThrows: "Wisdom, Charisma",
      skills: "",
      weapons: "Simple Weapons",
      startingEquipment: "",
      summary: "",
      tableColumns: ["Level","Cantrips","Prepared Spells","Spell Slots","Features"],
      coreFeatures: [],
      progression: [],
    },
    // ── DRUID ─────────────────────────────────────────────────────────────────
    {
      id: "druid", name: "Druid", primary: "Wisdom", hitDie: "d8",
      startingHP: "8 + CON modifier",
      hpPerLevel: "5 + CON modifier per level after 1st",
      armorTraining: "Light Armor, Medium Armor, Shields (non-metal)",
      savingThrows: "Intelligence, Wisdom",
      skills: "",
      weapons: "Simple Weapons",
      startingEquipment: "",
      summary: "",
      tableColumns: ["Level","Wild Shape Uses","Cantrips","Prepared Spells","Spell Slots","Features"],
      coreFeatures: [],
      progression: [],
    },
    // ── EIDOLON ───────────────────────────────────────────────────────────────
    {
      id: "eidolon", name: "Eidolon", primary: "Intelligence", hitDie: "d8",
      startingHP: "8 + CON modifier",
      hpPerLevel: "5 + CON modifier per level after 1st",
      armorTraining: "Light Armor",
      savingThrows: "Intelligence, Charisma",
      skills: "",
      weapons: "Simple Weapons",
      startingEquipment: "",
      summary: "Custom CotR class. See Eidolon class doc.",
      tableColumns: ["Level","Features"],
      coreFeatures: [],
      progression: [],
    },
    // ── FIGHTER ───────────────────────────────────────────────────────────────
    {
      id: "fighter", name: "Fighter", primary: "Strength or Dexterity", hitDie: "d10",
      startingHP: "10 + CON modifier",
      hpPerLevel: "6 + CON modifier per level after 1st",
      armorTraining: "Light Armor, Medium Armor, Heavy Armor, Shields",
      savingThrows: "Strength, Constitution",
      skills: "",
      weapons: "Simple and Martial Weapons",
      startingEquipment: "",
      summary: "",
      tableColumns: ["Level","Action Surges","Indomitable","Extra Attacks","Features"],
      coreFeatures: [],
      progression: [],
    },
    // ── GENSARCH ──────────────────────────────────────────────────────────────
    {
      id: "gensarch", name: "Gensarch", primary: "Strength", hitDie: "d10",
      startingHP: "10 + CON modifier",
      hpPerLevel: "6 + CON modifier per level after 1st",
      armorTraining: "Light Armor, Medium Armor, Shields",
      savingThrows: "Strength, Constitution",
      skills: "",
      weapons: "Simple and Martial Weapons",
      startingEquipment: "",
      summary: "Custom CotR class. Elemental warrior tradition — subclasses: Air, Earth, Fire, Water, Elamesta.",
      tableColumns: ["Level","Features"],
      coreFeatures: [],
      progression: [],
    },
    // ── MECHA ─────────────────────────────────────────────────────────────────
    {
      id: "mecha", name: "Mecha", primary: "Strength", hitDie: "d12",
      startingHP: "12 + CON modifier",
      hpPerLevel: "7 + CON modifier per level after 1st",
      armorTraining: "All Armor",
      savingThrows: "Strength, Constitution",
      skills: "",
      weapons: "Simple and Martial Weapons",
      startingEquipment: "",
      summary: "Custom CotR class.",
      tableColumns: ["Level","Features"],
      coreFeatures: [],
      progression: [],
    },
    // ── MONK ──────────────────────────────────────────────────────────────────
    {
      id: "monk", name: "Monk", primary: "Dexterity, Wisdom", hitDie: "d8",
      startingHP: "8 + CON modifier",
      hpPerLevel: "5 + CON modifier per level after 1st",
      armorTraining: "None",
      savingThrows: "Strength, Dexterity",
      skills: "",
      weapons: "Simple Weapons, Shortswords",
      startingEquipment: "",
      summary: "",
      tableColumns: ["Level","Martial Arts","Ki Points","Unarmored Movement","Features"],
      coreFeatures: [],
      progression: [],
    },
    // ── PALADIN ───────────────────────────────────────────────────────────────
    {
      id: "paladin", name: "Paladin", primary: "Strength, Charisma", hitDie: "d10",
      startingHP: "10 + CON modifier",
      hpPerLevel: "6 + CON modifier per level after 1st",
      armorTraining: "Light Armor, Medium Armor, Heavy Armor, Shields",
      savingThrows: "Wisdom, Charisma",
      skills: "",
      weapons: "Simple and Martial Weapons",
      startingEquipment: "",
      summary: "",
      tableColumns: ["Level","Lay on Hands","Channel Divinity","Spell Slots","Features"],
      coreFeatures: [],
      progression: [],
    },
    // ── ROGUE ─────────────────────────────────────────────────────────────────
    {
      id: "rogue", name: "Rogue", primary: "Dexterity", hitDie: "d8",
      startingHP: "8 + CON modifier",
      hpPerLevel: "5 + CON modifier per level after 1st",
      armorTraining: "Light Armor",
      savingThrows: "Dexterity, Intelligence",
      skills: "",
      weapons: "Simple Weapons, Hand Crossbows, Longswords, Rapiers, Shortswords",
      startingEquipment: "",
      summary: "",
      tableColumns: ["Level","Sneak Attack","Features"],
      coreFeatures: [],
      progression: [],
    },
    // ── SORCERER ──────────────────────────────────────────────────────────────
    {
      id: "sorcerer", name: "Sorcerer", primary: "Charisma", hitDie: "d6",
      startingHP: "6 + CON modifier",
      hpPerLevel: "4 + CON modifier per level after 1st",
      armorTraining: "None",
      savingThrows: "Constitution, Charisma",
      skills: "",
      weapons: "Daggers, Darts, Slings, Quarterstaffs, Light Crossbows",
      startingEquipment: "",
      summary: "",
      tableColumns: ["Level","Sorcery Points","Cantrips","Spells Known","Spell Slots","Features"],
      coreFeatures: [],
      progression: [],
    },
    // ── TELIKIN ───────────────────────────────────────────────────────────────
    {
      id: "telikin", name: "TeliKin", primary: "Intelligence", hitDie: "d8",
      startingHP: "8 + CON modifier",
      hpPerLevel: "5 + CON modifier per level after 1st",
      armorTraining: "Light Armor",
      savingThrows: "Intelligence, Wisdom",
      skills: "",
      weapons: "Simple Weapons",
      startingEquipment: "",
      summary: "Custom CotR class. Telekinetic combatants — subclasses: Void Guardian, The Void Striker, Void Clasher, Vigilance.",
      tableColumns: ["Level","Features"],
      coreFeatures: [],
      progression: [],
    },
    // ── WARLOCK ───────────────────────────────────────────────────────────────
    {
      id: "warlock", name: "Warlock", primary: "Charisma", hitDie: "d8",
      startingHP: "8 + CON modifier",
      hpPerLevel: "5 + CON modifier per level after 1st",
      armorTraining: "Light Armor",
      savingThrows: "Wisdom, Charisma",
      skills: "",
      weapons: "Simple Weapons",
      startingEquipment: "",
      summary: "",
      tableColumns: ["Level","Cantrips","Spells Known","Spell Slots","Slot Level","Invocations","Features"],
      coreFeatures: [],
      progression: [],
    },
    // ── WIZARD ────────────────────────────────────────────────────────────────
    {
      id: "wizard", name: "Wizard", primary: "Intelligence", hitDie: "d6",
      startingHP: "6 + CON modifier",
      hpPerLevel: "4 + CON modifier per level after 1st",
      armorTraining: "None",
      savingThrows: "Intelligence, Wisdom",
      skills: "",
      weapons: "Daggers, Darts, Slings, Quarterstaffs, Light Crossbows",
      startingEquipment: "",
      summary: "",
      tableColumns: ["Level","Cantrips","Prepared Spells","Spell Slots","Features"],
      coreFeatures: [],
      progression: [],
    },
  ],
  // Define the canonical ordering of parent classes for the sidebar grouping
  parentClassOrder: [
    "Artificer", "Barbarian", "Bard", "Cleric", "Druid", "Eidolon", "Esper",
    "Fighter", "Gensarch", "Mecha", "Monk", "Paladin", "Ranger", "Rogue",
    "Sorcerer", "TeliKin", "Warlock", "Wizard"
  ],
  subclasses: [
    { id: "aerial-sniper", name: "Aerial Sniper", parentClass: "Gensarch", element: "Air", summary: "A wind-based subclass that creates ranged air blasts and vacuum attacks to strike enemies from a distance.", features: [
      { level: 3, name: "Air Bolts", text: "Action: ranged wind blast 120 ft, Dex modifier to attack, 1d10 thunder/slashing/piercing magical damage." },
      { level: 7, name: "Compressed Air Bolt", text: "Once/short rest: charge one turn, fire 3d10 damage in 5 ft wide, 60 ft line; Dex save half." },
      { level: 11, name: "Static Dome", text: "+2 AC, resistance to ranged weapon damage for 1 minute. Recharge on short rest." },
      { level: 15, name: "Vacuum Shot", text: "Once/long rest: attack up to 3 enemies in a line; each takes Elemental Damage Die + 3d10 thunder, ignores cover/armor." }
    ], note: "" },
    { id: "air-acrobat", name: "Air Acrobat", parentClass: "Gensarch", element: "Air", summary: "An aerial subclass that gains flying speed, momentum-powered strikes, and evasive aerial reactions.", features: [
      { level: 3, name: "Soaring Style", text: "Fly speed 10 ft (20 ft at 7th, 30 ft at 15th); airborne attacks have disadvantage until first hit." },
      { level: 7, name: "Momentum Strike", text: "Move 20+ ft before attack: deal double proficiency bonus additional damage and force Str save or push 15 ft." },
      { level: 11, name: "Reactive Lift", text: "Reaction: fly 15 ft up when targeted by melee; if attack misses, make opportunity attack as part of reaction." },
      { level: 15, name: "Hurricane Pivot", text: "When hit by an AOE or spell, expend 1 Genn Die to spin-dash leap, halving the damage and moving 30 ft in any direction." }
    ], note: "" },
    { id: "air-blade", name: "Air Blade", parentClass: "Gensarch", element: "Air", summary: "A swift melee subclass that chains rapid attacks with wind-enhanced slashing strikes.", features: [
      { level: 3, name: "Whirlwind Strikes", text: "Bonus action extra unarmed/light weapon attack; hit deals Elemental Damage Die slashing damage." },
      { level: 7, name: "Cyclone Dance", text: "Once per turn, 2+ hits force Dex save or target knocked prone or disarmed (your choice)." },
      { level: 11, name: "Gale Step", text: "Move up to 40 ft between attacks; hits don't trigger opportunity attacks (misses impose disadvantage instead)." },
      { level: 15, name: "Blade Tempest", text: "Once per long rest, flurry of four attacks as one action (extra attacks still available after). Each hit adds 1 Genn Die slashing damage." }
    ], note: "" },
    { id: "air-guard", name: "Air Guard", parentClass: "Gensarch", element: "Air", summary: "A defensive subclass that redirects incoming attacks and reflects damage back to attackers with wind.", features: [
      { level: 3, name: "Wind Redirection", text: "Reaction when hit within 10 ft: reduce damage by 1d8+DEX+WIS. If reduced to 0 damage, send wind blast: Str save or attacker pushed 10 ft." },
      { level: 7, name: "Reflective Burst", text: "On successful redirect, spend 1 Genn Die to reflect full damage back to attacker as thunder damage." },
      { level: 11, name: "Cyclone Parry", text: "Reaction when missed by melee: move 20 ft via gust (no opportunity attacks); creatures adjacent to you take Elemental Damage Die in thunder." },
      { level: 15, name: "Vacuum Barrier", text: "Reaction: create wind barrier on you or ally within 30 ft until start of your next turn — +3 AC and reflects projectiles back to attacker (Dex save or half damage)." }
    ], note: "" },
    { id: "armorwright", name: "Armorwright", parentClass: "Artificer", summary: "Artificers who craft and enhance magical adaptive armor as a lethal, versatile extension of their will.", features: [
      { level: 3, name: "Arcane Armory", text: "Proficiency with martial/simple weapons and heavy armor. Imbue one suit per long rest with: Flight Module (fly 30 ft for 10 min; 30 min at 10th; indefinite at 20th), Force Projector (action: INT attack, 1d10+INT force 60 ft; +1d10 at 5th/11th/17th), or Force Blade (bonus action: 1d8 force finesse melee; 2d8 at 11th). Transferring enchantment destroys prior armor." },
      { level: 5, name: "Arcane Lenses", text: "Bonus action: activate for 1 hour. Lens of Detection (see magic auras and traps within 60 ft) or True Vision Lens (truesight 30 ft). Once per long rest each." },
      { level: 9, name: "Energy Channeling", text: "Lightning Arc: action, arc between up to 3 targets within 30 ft of each other, Dex save DC 8+PB+INT, 8d8 lightning (10d8 at 16th). Once per short or long rest." },
      { level: 15, name: "Reactive Shielding", text: "Force Field: reaction, you and allies within 10 ft gain resistance to next AoE/spell. Once per long rest. Plasma Shield: reaction, add INT modifier to AC for 1 round. 3 times per long rest." },
      { level: 18, name: "Master Armor Enchanter", text: "Barrage of Lasers: once per long rest, 60-ft cone, Dex save DC 8+PB+INT, 12d10 force. Empowering Absorption: reaction when taking elemental damage (cold/fire/force/lightning/necrotic/psychic/radiant), absorb half and add it to next attack before rolling. Once per long rest." }
    ], note: "" },
    { id: "elementalist-savant", name: "Elementalist Savant", parentClass: "Artificer", summary: "Artificers who harness Elemental Mana Stones to unleash elemental effects and fuse elements for powerful combinations.", features: [
      { level: 3, name: "Elemental Mana Stones", text: "Long rest: create INT modifier (min 1) stones, each a chosen element (Fire/Air/Water/Earth/Necrotic/Ice/Radiant/Poison/Force/Psychic/Acid). Action: activate one for its area effect (3d6 at 3rd, 4d6 at 5th, 5d6 at 9th, 6d6 at 15th). Save DC = spell save DC or Arcana check roll (1d20+INT)." },
      { level: 6, name: "Elemental Infusion", text: "Long rest: infuse one weapon (+1d8 of element) or armor (resistance to element) for 1 minute when activated. Uses = INT modifier (min 1) per long rest." },
      { level: 10, name: "Elemental Mastery", text: "Combine two stones as one action for fusion effects: Fire+Air=15-ft radius Dex save 6d6 fire + push 10 ft; Water+Earth=10-ft radius Str save 6d6 bludgeoning + prone; Necrotic+Radiant=30 ft 4d6 each (no save). Once per long rest or expend 3rd+ spell slot." },
      { level: 14, name: "Stone of Ultimate Power", text: "Once per long rest: action, 30-ft radius Dex save. Fail = 10d6 split among up to 3 chosen types. Success = half. Allies in area gain temp HP = INT modifier + one Mana Stone die." }
    ], note: "" },
    { id: "godslayer-artificer", name: "Godslayer", parentClass: "Artificer", antiDivine: true, summary: "Artificers who craft anti-divine weapons, armor, and bombs to hunt and destroy celestials and fiends.", features: [
      { level: 3, name: "Tool & Weapon Proficiency", text: "Proficiency with smith's and tinker's tools; proficiency in martial weapons and light, medium, and heavy armor." },
      { level: 3, name: "Specialist Spells", text: "Always prepared: 3rd Protection from Evil and Good, Divine Favor; 5th Magic Weapon, Silence; 9th Dispel Magic, Spirit Guardians; 13th Banishment, Death Ward; 17th Dispel Evil and Good, Holy Weapon." },
      { level: 3, name: "Divine Armaments", text: "Long rest: craft up to 2 Divine Armaments. Options: Divine Slayer Weapon (+1d10 force vs celestials/fiends/divine; 2d10 at 9th, 3d10 at 15th), Aegis of the Defiant (resistance to radiant/necrotic/force; advantage on charm/fright/paralysis saves vs divine), Divine Warding Amulet (+2 AC, advantage on saves vs celestial/fiend spells). Usable within 120 ft." },
      { level: 5, name: "Divine Disruptor Bomb", text: "Long rest: create up to 3 bombs. Action, throw 60 ft, 15-ft radius, Dex save: 6d6 force (celestials/fiends disadvantage; on fail also Con save or stunned + lose concentration). 8d6 at 9th, 10d6 at 15th." },
      { level: 9, name: "Divine Analysis", text: "Religion proficiency + double prof on Religion/History/Arcana checks about gods. Bonus action: analyze creature within 120 ft — learn type and resistances; for 1 minute attacks ignore resistances and you have advantage. Uses = INT modifier (min 1), recharge short or long rest." },
      { level: 15, name: "Divine Eradicator / Unholy Ray", text: "Once per long rest: Pulse — 60-ft radius Con save; celestials/fiends fail = 14d10 force + stunned + disadvantage on saves 10 min; others fail = 8d10. OR Unholy Ray — 100-ft line 5 ft wide, Dex save, 14d10 force (celestials/fiends disadvantage; stun + kill severs divine connection). After use, Divine Armaments lose properties until short rest." }
    ], note: "" },
    { id: "primordial-bladeweaver", name: "Primordial Bladeweaver", parentClass: "Artificer", summary: "Artificers who infuse their weapon with every damage type, combining elemental effects for devastating Confluence strikes.", features: [
      { level: 3, name: "Blade Imbuement", text: "Bonus action: imbue weapon with one damage type, dealing +2d6 of that type with secondary effect (fire=burning, cold=slow, lightning=no reactions, acid=-2 AC, poison=poisoned, psychic=disadvantage on attacks, radiant=no invisibility, necrotic=halve healing, thunder=deafen nearby, force=push 10 ft, physical=+2d6 base damage). Uses = Artificer level. Martial Mastery and Elemental Manipulation cantrips (Control Flames, Shape Water, etc.) granted." },
      { level: 5, name: "Dual Imbuement", text: "Imbue with two damage types simultaneously; both +2d6 and both secondary effects apply. Uses = proficiency bonus. Also gain Extra Attack." },
      { level: 9, name: "Elemental Synergy", text: "Resistance to imbued element(s) until start of next turn. Secondary effects can apply to a second creature within 15 ft of the target. Uses = Blade Imbuement uses." },
      { level: 13, name: "Weave Confluence", text: "Imbue up to three types simultaneously; all deal 2d6 and all effects apply. Special Confluence: Fire+Lightning+Thunder=Stormstrike (+3d6 each, nearby take 2d6); Necrotic+Poison+Acid=Corrupting Blight (paralyzed 1 turn); Radiant+Force+Psychic=Mindfire (blinded+incapacitated 1 min, Wis save ends); Cold+Piercing+Slashing=Frozen Shrapnel (15-ft splash 2d6 cold+slashing, prone). Uses = INT modifier." },
      { level: 18, name: "Primordial Ascension", text: "Action, 6 rounds: imbue with all damage types; each hit deals 1d6 of every type with all secondary effects. Gain immunity to one chosen type until start of next turn. Once per long rest." }
    ], note: "" },
    { id: "path-of-the-drunk", name: "Path of the Drunk", parentClass: "Barbarian", summary: "A Barbarian subclass that uses drunken, unpredictable movement to evade attacks and gain resilience in battle.", features: [
      { level: 3, name: "Drunken Evasion", text: "Advantage on Dex saves; attacks against you have disadvantage; bonus action drink grants temp HP equal to Barbarian level + Con modifier for 1 hour." },
      { level: 6, name: "Unpredictable Movement", text: "Reaction to impose disadvantage on one attack roll against you while raging; uses equal to Con modifier (min 1), recharge on long rest." },
      { level: 10, name: "Liquid Courage", text: "While raging: immune to frightened, resistance to psychic damage; reaction melee attack when hit within 5 ft, on hit Strength DC 8+PB+STR or prone." },
      { level: 14, name: "Drunken Mastery", text: "While raging: cannot be knocked prone, advantage on Con saves; bonus action drink grants temp HP equal to twice Barbarian level + Con modifier." }
    ], note: "" },
    { id: "path-of-the-godhood", name: "Path of the Godhood", parentClass: "Barbarian", summary: "Barbarians who channel divine storm-fury, calling lightning and gaining the speed and resilience of a god.", features: [
      { level: 3, name: "Divine Fury", text: "While raging, weapon attacks deal +1d8 lightning damage." },
      { level: 3, name: "Descending Wrath", text: "On entering rage, call a lightning bolt at creature within 30 ft: Dex save DC 8+PB+STR, 3d8 lightning (half on success). Uses = proficiency bonus per long rest." },
      { level: 6, name: "Supernatural Vitality", text: "Resistance to lightning and thunder damage. Reaction when taking damage: reduce by 1d12 + Barbarian level. Uses = CON modifier (min 1) per long rest." },
      { level: 10, name: "Speed of the Gods", text: "Movement speed +15 ft; Dash as bonus action; gain Deflect Missiles feature." },
      { level: 14, name: "Wrathful Anger", text: "On rage entry: resistance to all damage, immunity to lightning/thunder; fly speed = walking; +1d12 lightning on weapon hits; melee hit forces Str save or prone; throw lightning bolt (2d10+STR, 60 ft normal/disadvantage 61-120 ft); action to storm in 20-ft radius Dex save 2d10 lightning. Once per long rest for the storm." }
    ], note: "" },
    { id: "path-of-the-godslayer", name: "Path of the Godslayer", parentClass: "Barbarian", antiDivine: true, summary: "Barbarians who channel their rage to defy and combat divine beings, resisting celestial and fiendish power.", features: [
      { level: 3, name: "Divine Defiance", text: "Resistance to radiant/necrotic while raging; add rage bonus to attacks vs celestials, fiends, deity-linked creatures; advantage on saves vs divine/celestial sources." },
      { level: 6, name: "Wrathful Retaliation", text: "Reaction when hit within 5 ft while raging: deal force damage equal to Barbarian level + Constitution modifier." },
      { level: 10, name: "Juggernaut's Resilience", text: "While raging, resistance to all damage except psychic. If reduced to 0 HP and not killed outright, reaction to make Con save (DC 10 + half damage taken); success = drop to 1 HP instead. Uses = Con modifier (min 1), recharge long rest." },
      { level: 14, name: "Slayer of Gods", text: "On hit while raging, deal additional force damage = 2x Barbarian level. If target is celestial or deity-linked, Wisdom save DC 8+PB+CON or frightened 1 minute (save repeats end of turn). Uses = Con modifier (min 1), recharge long rest." }
    ], note: "" },
    { id: "path-of-the-tarasque", name: "Path of the Tarasque", parentClass: "Barbarian", summary: "Barbarians channel the primal power of the legendary Tarasque, gaining unmatched resilience, fury, speed, and might.", features: [
      { level: 3, name: "Tarasque Resilience", text: "While raging, resistance to all damage except psychic; HP max increases by 2x Barbarian level." },
      { level: 6, name: "Tarasque's Fury", text: "While raging, add Constitution modifier to melee damage; once per turn force Strength save (DC=8+PB+STR) or prone." },
      { level: 10, name: "Tarasque's Speed", text: "While raging, +20 ft movement, Dash as bonus action, advantage on Dexterity saving throws." },
      { level: 14, name: "Tarasque's Might", text: "While raging: size Large, +5 ft reach, advantage on STR checks/saves, melee hits deal +2d12 (uses = CON mod, long rest)." },
      { level: 14, name: "Tarasque's Roar", text: "Action: each creature of your choice within 30 ft makes Wisdom save DC 8+PB+CON or is frightened 1 minute. Save repeats at end of each turn. Once per long rest." }
    ], note: "" },
    { id: "path-of-the-umber-hulk", name: "Path of the Umber Hulk", parentClass: "Barbarian", summary: "Barbarians who gain the tunneling power, rending claws, and gaze-based confusion of the umber hulk.", features: [
      { level: 3, name: "Umber Hulk's Fury", text: "Unarmed strikes use d8 (can deal bludgeoning/piercing/slashing), count as magical, gain tremorsense 30 ft and burrow speed 20 ft." },
      { level: 6, name: "Rending Claws", text: "Unarmed damage increases to d10. On hit while raging, deal +1d8 damage at start of target's next turn (2d8 at 14th)." },
      { level: 10, name: "Umber Hulk's Resilience", text: "Resistance to nonmagical bludgeoning/piercing/slashing even when not raging. While raging: also resistance to poison/acid, advantage on saves vs charmed/frightened/paralyzed." },
      { level: 14, name: "Confusing Gaze", text: "Bonus action: enter Umbering Rage 1 minute. Creature seeing your eyes within 30 ft makes CHA save DC 8+CON+PB start of its turn; fail = roll d8: 1-4 paralyzed, 5-6 random movement, 7-8 attacks random creature. Creature may avert eyes (disadvantage on attacks vs you, advantage on yours). Uses = half proficiency bonus." }
    ], note: "" },
    { id: "path-of-the-war-ravager", name: "Path of the War Ravager", parentClass: "Barbarian", summary: "Barbarians who unleash a storm of attacks while wearing armor, overwhelming enemies through sheer volume of strikes.", features: [
      { level: 3, name: "Blitz", text: "Bonus action: make STR/DEX modifier (min 1) weapon attacks. Once per short or long rest. Armored Rage: wear light, medium, or heavy armor and still benefit from Rage and fast movement." },
      { level: 6, name: "Brutalize", text: "On reducing creature to 0 HP with melee, immediately make one melee attack against creature within 10 ft. Uses = STR modifier (min 1) per long rest." },
      { level: 10, name: "Relentless Onslaught", text: "3 attacks total when using Attack action. On hit while raging, choose: Push (Str save or 1d8 + push 10 ft), Hamper (1d8 extra + -10 ft speed), or Crushing Blow (Str save or 1d8 extra + prone)." },
      { level: 14, name: "Devastating Flurry", text: "When using Blitz, make additional attacks equal to half proficiency bonus (rounded up). On crit, deal extra damage die and target makes Con save DC 8+PB+STR or stunned until end of your next turn." }
    ], note: "" },
    { id: "college-of-godslaying", name: "College of Godslaying", parentClass: "Bard", antiDivine: true, summary: "Bards who weaponize divine lore to weaken and destroy celestials, fiends, and gods through song and spell.", features: [
      { level: 3, name: "Bonus Proficiencies", text: "Gain proficiency with medium armor, shields, martial weapons, and Religion skill." },
      { level: 3, name: "Divine Scorn", text: "Reaction+Bardic Inspiration: subtract Inspiration die from creature's roll; on miss deal that much radiant/necrotic damage. Inspiration die adds to damage vs celestials/fiends once per turn." },
      { level: 6, name: "Hymn of Defiance", text: "Action: 30-ft aura 1 min. Celestials/fiends Wisdom save vs spell DC or can't cast spells until next turn; bypasses magic resistance. Allies gain resistance to radiant/necrotic and advantage on divine saves. Uses = Charisma modifier (min 1), recharge long rest." },
      { level: 14, name: "Divine Weakness", text: "Action: target makes Wisdom save vs spell DC or marked 1 min. Marked: disadvantage on saves vs your spells, +Charisma modifier radiant/necrotic on hits (doubled for celestials/fiends), can't regain HP. Uses = Charisma modifier (min 1), recharge long rest." }
    ], note: "" },
    { id: "college-of-souls", name: "College of Souls", parentClass: "Bard", summary: "A bardic college that animates and commands the dead through haunting musical performances.", features: [
      { level: 3, name: "Necrotic Performance", text: "Expend Bardic Inspiration to animate a corpse within 30 ft as zombie/skeleton for 1 hour; control up to Charisma modifier undead." },
      { level: 6, name: "Requiem of Resilience", text: "Bonus action grants controlled undead temp HP equal to Bard level + Charisma modifier; advantage on turn/destroy saves." },
      { level: 14, name: "Symphony of the Damned", text: "Cast Animate Dead without spell slot; animate two extra corpses; controlled undead gain +Charisma modifier to attack and damage rolls." }
    ], note: "" },
    { id: "college-of-arcane-marksman", name: "College of the Arcane Marksman", parentClass: "Bard", summary: "Bards who blend musical performance with summoned spectral weapons and magical armament control.", features: [
      { level: 3, name: "Enchanted Performance", text: "Bardic Inspiration: summon spectral weapon (1 minute, spell attack, 1d8 force, bonus action to command 30 ft). Weapon Manipulation: action, target weapon within 60 ft, Str save DC 8+PB+CHA or you control it 1 minute (bonus action attack). Once per short or long rest." },
      { level: 6, name: "Harmonic Barrage", text: "Arcane Volley: action, expend Bardic Inspiration, 60-ft cone of magical weapons, Dex save: 2d6+CHA force. Weapon Bond: 1-hour ritual to bond a weapon — summon to hand as bonus action, advantage on saves vs disarmed." },
      { level: 14, name: "Maestro of War", text: "Symphony of Blades: expend Bardic Inspiration to animate up to 3 weapons within 60 ft; each attacks (spell attack, 1d8 force). Master Manipulator: Weapon Manipulation targets up to 3 weapons simultaneously." }
    ], note: "" },
    { id: "college-of-the-siren", name: "College of the Siren", parentClass: "Bard", summary: "Bards who wield captivating sea-siren songs to charm, manipulate, and bolster allies with maritime magic.", features: [
      { level: 3, name: "Bonus Proficiencies", text: "Proficiency with navigator's tools and vehicles (water). Learn Shape Water cantrip." },
      { level: 3, name: "Siren's Song", text: "When using Bardic Inspiration, choose additional effect: Luring Melody (advantage on Deception/Persuasion 10 min) or Rousing Chorus (temp HP = Bard level)." },
      { level: 6, name: "Sea Legs", text: "Advantage on saves vs knocked prone or restrained. Reaction: grant this advantage to ally within 30 ft." },
      { level: 14, name: "Shanty of the High Seas", text: "Song of Rest bonus: Pirate's Resolve (advantage vs frightened/charmed 1hr), Sailor's Endurance (+2 Con saves 1hr), or Mariner's Might (+1d6 melee damage 1hr). Siren's Call: action, 60 ft, Wis save DC 8+PB+CHA or charmed 1 min (incapacitated, speed 0; repeat save each turn). Immune 24hr on success. Once per long rest." }
    ], note: "" },
    { id: "college-of-the-sun", name: "College of the Sun", parentClass: "Bard", summary: "Bards channel Lathander's radiant power through archery and musical performances to control the battlefield.", features: [
      { level: 3, name: "Bonus Proficiencies", text: "Gain proficiency with longbows and shortbows; learn Guidance cantrip, doesn't count against cantrips known." },
      { level: 3, name: "Radiant Performance", text: "Bardic Inspiration grants temp HP equal to Bard level; if used on attack hit, deals extra 1d6 radiant damage." },
      { level: 6, name: "Sunlit Arrows", text: "Expend Bardic Inspiration on ranged hit for +2d6 radiant; target makes Con save DC (8+prof+Cha) or blinded until end of next turn." },
      { level: 14, name: "Divine Melody", text: "Song of Rest grants one: resistance to radiant/fire 1hr, +2 ranged attack rolls 1hr, or +Cha mod HP regained." }
    ], note: "" },
    { id: "domain-of-archangels", name: "Domain of Archangels", parentClass: "Cleric", summary: "Clerics blessed by celestial beings who manifest divine stars and summon archangels to smite foes.", features: [
      { level: 1, name: "Domain Spells", text: "Level 1: Guiding Bolt, Shield of Faith. Level 3: Spiritual Weapon, Moonbeam. Level 5: Daylight, Spirit Guardians. Level 7: Guardian of Faith, Divination. Level 9: Flame Strike, Holy Weapon." },
      { level: 1, name: "Celestial Stars", text: "Bonus action: summon stars equal to Wisdom modifier (min 1) for 1 minute; reaction to reduce damage by 1d8. Stars disappear after intercepting." },
      { level: 2, name: "Channel Divinity: Summon Archangel", text: "Action, present holy symbol; archangel appears within 30 ft and makes a melee spell attack against a creature of your choice within 30 ft, dealing 2d10 + cleric level radiant on hit, then disappears." },
      { level: 6, name: "Radiant Shield", text: "+2 bonus to AC while at least one star active. When a star intercepts an attack, attacker takes radiant damage equal to Wisdom modifier (min 1)." },
      { level: 8, name: "Potent Spellcasting", text: "Add Wisdom modifier to damage dealt with cleric cantrips." },
      { level: 17, name: "Archangel's Wrath", text: "Channel Divinity now summons up to 3 archangels, each attacking a different creature within 30 ft for 4d10 + cleric level radiant. Bonus action: sprout wings, gain +1 AC and fly speed equal to movement speed." }
    ], note: "" },
    { id: "domain-of-godslaying", name: "Domain of Godslaying", parentClass: "Cleric", antiDivine: true, summary: "Clerics who draw power from Death itself to oppose and slay divine entities using necrotic and elemental forces.", features: [
      { level: 1, name: "Domain Spells", text: "Level 1: Wrathful Smite, Inflict Wounds. Level 3: Ray of Enfeeblement, Silence. Level 5: Spirit Guardians, Bestow Curse. Level 7: Blight, Banishment. Level 9: Destructive Wave, Dispel Evil and Good." },
      { level: 1, name: "Bonus Proficiencies", text: "Gain proficiency with heavy armor and martial weapons." },
      { level: 1, name: "Death's Gift", text: "On weapon hit, deal bonus necrotic damage equal to Wisdom modifier. Uses equal to proficiency bonus per long rest." },
      { level: 2, name: "Channel Divinity: Divine Banishment", text: "Action, present holy symbol, one creature within 30 ft makes Charisma save or banished to home plane; if native to this plane, stunned until end of your next turn. Celestials/fiends have disadvantage on the save." },
      { level: 6, name: "Divine Slayer", text: "On hit, ignore necrotic resistance/immunity. If creature is celestial or has divine ancestry, deal +1d8 necrotic on hit. Add Wisdom modifier to spell damage vs divine creatures." },
      { level: 8, name: "Potent Spellcasting", text: "Add Wisdom modifier to damage dealt with cleric cantrips." },
      { level: 17, name: "Death's Reprisal", text: "Action, 1-minute concentration aura. Creatures within 30 ft have disadvantage on fright saves; divine ancestry creatures have disadvantage on saves vs all your spells. On reducing a divine creature to 0 HP, choose to destroy it utterly (no resurrection < Wish). Once per turn on hit vs divine creature: +3d10 necrotic. Once per long rest." }
    ], note: "" },
    { id: "domain-of-might", name: "Domain of Might", parentClass: "Cleric", summary: "Clerics of war deities who become unstoppable warriors, combining divine strength with battlefield dominance.", features: [
      { level: 1, name: "Domain Spells", text: "1st: Divine Favor, Shield; 3rd: Magic Weapon, Spiritual Weapon; 5th: Crusader's Mantle, Haste; 7th: Freedom of Movement, Staggering Smite; 9th: Destructive Wave, Steel Wind Strike." },
      { level: 1, name: "Bonus Proficiencies", text: "Proficiency with all martial weapons, heavy armor, and shields." },
      { level: 1, name: "Divine Strike", text: "On weapon hit, deal +1d8 radiant damage (2d8 at 8th, 3d8 at 14th). Uses = WIS modifier (min 1) per long rest." },
      { level: 2, name: "Channel Divinity: Warrior's Blessing", text: "Action: one creature within 30 ft gains +2 to attack rolls, damage rolls, and AC for 1 minute." },
      { level: 6, name: "Divine Resilience", text: "Reaction when taking damage: reduce by cleric level + WIS modifier; gain temp HP = half prevented. Uses = WIS modifier (min 1) per long rest." },
      { level: 8, name: "Mighty Spellcasting", text: "Add WIS modifier to cleric cantrip damage. Add WIS modifier to melee damage rolls in addition to STR. Cast Divine Favor or Magic Weapon on self or ally once per short rest without spell slot." },
      { level: 17, name: "Avatar of Might", text: "Action, 1 minute: STR +4 (max 24), carrying capacity doubles; resistance to all damage, advantage on all saves; weapon hits deal +3d8 radiant or necrotic; 30-ft aura grants allies advantage on attacks/saves and gives enemies disadvantage on attacks against you. Once per long rest." }
    ], note: "" },
    { id: "domain-of-platinum-dragon", name: "Domain of the Platinum Dragon", parentClass: "Cleric", summary: "Clerics blessed by Bahamut who protect allies with divine shields and unleash platinum dragon wrath.", features: [
      { level: 1, name: "Domain Spells", text: "1st: Guiding Bolt, Shield of Faith; 3rd: Spiritual Weapon, Moonbeam; 5th: Daylight, Spirit Guardians; 7th: Guardian of Faith, Divination; 9th: Flame Strike, Holy Weapon." },
      { level: 1, name: "Blessings of Bahamut", text: "Proficiency with heavy armor and martial weapons. Dragon's Resilience: HP max +1 per cleric level." },
      { level: 2, name: "Channel Divinity: Bahamut's Shield", text: "Action: you and allies within 30 ft gain +2 AC and saving throws for 1 minute." },
      { level: 2, name: "Channel Divinity: Platinum Fury", text: "Action: enemies within 30 ft make Dex save or take 2d10 + cleric level radiant (half on success)." },
      { level: 6, name: "Aura of the Platinum Dragon", text: "You and allies within 10 ft have resistance to fire and cold. Once per long rest: action, grant up to 5 allies within 30 ft temp HP = 2d10 + cleric level." },
      { level: 8, name: "Divine Strike", text: "Once per turn on weapon hit: +1d8 radiant (2d8 at 14th)." },
      { level: 17, name: "Platinum Dragon's Wrath", text: "Action, 1 minute: resistance to fire/cold/lightning/thunder/radiant/physical; when taking damage, attacker within 60 ft takes half as radiant; action to exhale 60-ft cone Dex save 8d10 radiant. Once per long rest." }
    ], note: "" },
    { id: "circle-of-defiance", name: "Circle of Defiance", parentClass: "Druid", antiDivine: true, summary: "Druids who reject divine influence and wield primal power to disrupt and punish divine magic.", features: [
      { level: 2, name: "Circle Spells", text: "Level 3: Detect Evil and Good, Magic Missile. Level 5: Counterspell, Dispel Magic. Level 7: Banishment, Guardian of Nature. Level 9: Dispel Evil and Good, Wall of Force. Always prepared, don't count against prepared spells." },
      { level: 2, name: "Primal Defiance", text: "Learn Thaumaturgy. Creatures with divine ancestry have disadvantage on saves against your spells. Channel the Wild: reaction to a creature casting a spell within 60 ft — expend Wild Shape use; creature makes Con save vs spell DC or spell fizzles and it takes force damage = druid level. Success = spell casts normally. Once per short or long rest." },
      { level: 6, name: "Savage Transformation", text: "Wild Shape forms count as magical. +1d6 necrotic damage vs divine creatures in beast form. Gain temp HP = 2x druid level on transform. Add Wisdom modifier to one proficient save type while transformed." },
      { level: 10, name: "Nature's Rejection", text: "Resistance to radiant damage; immune to charm/fright from celestials/fiends. Action, expend spell slot: one celestial/fiend/divine caster within 60 ft makes Wisdom save vs spell DC or can't regain HP for 1 minute. Once per long rest." },
      { level: 14, name: "Avatar of the Primordial Wild", text: "Bonus action, 1 minute. Attacks bypass resistances/immunities. Divine creatures within 30 ft have disadvantage on saves vs your spells/abilities. +2d10 necrotic on hits vs celestials/fiends. Temp HP = half max HP on entry; reaction to regain HP = half necrotic from last attack. Once per long rest." }
    ], note: "" },
    { id: "circle-of-dragons", name: "Circle of Dragons", parentClass: "Druid", summary: "Druids who revere dragons, transforming into dragon-like forms and exhaling destructive elemental breath.", features: [
      { level: 2, name: "Circle Spells", text: "Always prepared: 3rd Dragon's Breath, Scorching Ray; 5th Protection from Energy, Fireball; 7th Elemental Bane, Stoneskin; 9th Flame Strike, Hold Monster. Also learn Thaumaturgy." },
      { level: 2, name: "Draconic Wild Shape", text: "Wild Shape into a drake form: Medium, AC 14+WIS, HP = druid level+WIS+PB, speed 30/fly 30. Choose one immunity: acid/cold/fire/lightning/poison. Bite: 1d8+WIS piercing (spell attack). Lasts half druid level hours." },
      { level: 6, name: "Dragon's Breath", text: "Action: 30-ft cone, Dex save, 6d6 damage of chosen type (7d6 at 10th, 8d6 at 14th, 12d8 at 20th). Uses = WIS modifier (min 1) per long rest." },
      { level: 10, name: "Draconic Resilience", text: "Resistance to chosen Dragon's Breath damage type. +2 AC while unarmored." },
      { level: 14, name: "Dragon Form", text: "Wild Shape into adult dragon of chosen type (Large, AC 18, HP = druid level x10, speed 40/fly 80, STR 24, CON 22). Multiattack: bite (2d10+WIS) and two claws (2d6+WIS). Breath Weapon recharge 5-6: 60-ft cone, Dex save, 12d6." }
    ], note: "" },
    { id: "circle-of-poison", name: "Circle of Poison", parentClass: "Druid", summary: "Druids who harness toxic power through poison-infused Wild Shapes and venomous strikes.", features: [
      { level: 2, name: "Circle Spells", text: "Learn Poison Spray cantrip. Always prepared: 3rd Ray of Sickness, Melf's Acid Arrow; 5th Stinking Cloud, Poisonous Cloud; 7th Blight, Giant Insect; 9th Cloudkill, Contagion." },
      { level: 2, name: "Toxic Wild Shape", text: "Wild Shape into any beast with poisonous attack or trait (within normal Wild Shape limits)." },
      { level: 6, name: "Venomous Strike", text: "On melee weapon hit or unarmed strike, expend Wild Shape use: +3d8 poison; target makes Con save vs spell DC or poisoned 1 minute (repeat save each turn)." },
      { level: 10, name: "Poisonous Form", text: "Resistance to poison; advantage on saves vs poisoned. While Wild Shape: bonus action, 10-ft radius exhale, Con save, druid level poison damage (half on success). Once per short or long rest." },
      { level: 14, name: "Aspect of the Purple Worm", text: "Expend all Wild Shape uses to become purple worm for 10 rounds or until 0 HP. Normal form bonus: 1-minute Poisonous Bite (+2d10 poison), Toxic Aura (disadvantage on saves vs poisoned within 10 ft), Venomous Resilience (immunity to poison/poisoned). Once per long rest." }
    ], note: "" },
    { id: "circle-of-the-fey", name: "Circle of the Fey", parentClass: "Druid", summary: "Druids bonded to the Feywild who wield force damage, spatial manipulation, and reality-bending power.", features: [
      { level: 2, name: "Feywild's Wrath", text: "Learn Eldritch Blast cantrip (druid cantrip, add WIS to damage). Forceful Nature: reroll any 1 on force damage dice, must keep new roll." },
      { level: 6, name: "Feywild's Fury", text: "Forceful Spells: when casting force spell, deal +druid level force damage. Uses = WIS modifier (min 1) per long rest. Fey Resilience: resistance to force damage; advantage vs charmed." },
      { level: 10, name: "Feywild's Embrace", text: "Fey Step: bonus action, teleport 30 ft, optionally deal WIS modifier force to creatures within 5 ft of origin. Uses = WIS modifier (min 1) per long rest. Fey Presence: cast Misty Step without slot once per short or long rest." },
      { level: 14, name: "Feywild's Power", text: "Feywild's Strike: when dealing force damage, target makes Con save DC 8+PB+WIS or stunned until end of your next turn. Once per short or long rest. Force Mastery: deal max force damage instead of rolling. Once per long rest." }
    ], note: "" },
    { id: "circle-of-lycanthropy", name: "Circle of Lycanthropy", parentClass: "Druid", summary: "Druids who embrace lycanthropy as a sacred gift, transforming into powerful hybrid lycan forms tied to specific were-creatures.", features: [
      { level: 2, name: "Moonbound Initiation", text: "Wild Shape may become a Lycan Form (hybrid humanoid-beast): retain equipment, retain spellcasting, gain temp HP = 5 + druid level, retain speech and ally recognition. Lasts 1 hour or until 0 HP. Choose one form: Werewolf (+10 ft speed, advantage Perception smell/hearing, bonus Pounce), Werebear (+2 AC, advantage Str, resistance nonmagical physical), Weretiger (advantage Stealth/Acrobatics, +1d8 if moved 10+ ft, climb speed), Wereboar (temp HP each turn, advantage fright/charm saves, charge prone), Were-Shark (double swim, breathe water, advantage vs creatures < half HP), Were-Dragon (+2 AC, Frightful Presence 1/transform, +1d6 elemental, 5d6 breath 15-ft cone), Were-Rat (Stealth/Sleight advantage, Plague Bite, move through spaces), Were-Raven (fly speed, advantage Perception/Insight, Omen Sight, +1d6 necrotic). Unarmed attacks: Bite 1d10+WIS piercing, Claw 1d8+WIS slashing, magical." },
      { level: 6, name: "Primal Bloodline", text: "Cast spells while in Lycan Form. On natural weapon hit, deal +1d10 elemental (acid/cold/lightning/necrotic) once per turn. Advantage on Initiative; cannot be surprised while conscious." },
      { level: 10, name: "Predator's Ascension", text: "Regeneration = WIS modifier at start of turn (if above 0 HP). Advantage on saves vs spells. Moonbound Leap: bonus action, leap 30 ft no opportunity attacks; if adjacent to creature on landing, make one natural weapon attack." },
      { level: 14, name: "Avatar of the Moon Curse", text: "Once per long rest on transform: resistance to all damage except radiant; advantage on all attack rolls; +20 ft movement. On reducing creature to 0 HP: move half speed and make one additional attack. The Beast Remembers: no exhaustion on leaving form; witnesses make Wis save or frightened 1 minute." }
    ], note: "" },
    { id: "catapult", name: "Catapult", parentClass: "Gensarch", element: "Earth", summary: "A ranged subclass that hurls elemental stones and boulders to bombard enemies at extreme range.", features: [
      { level: 3, name: "Stone Barrage", text: "Action: hurl stones equal to Proficiency Bonus, each dealing 1d8 bludgeoning. Or fire single boulder for (1d8 x Proficiency Bonus) to one target." },
      { level: 7, name: "Explosive Impact", text: "Once per turn on stone hit, cause shockwave: creatures within 5 ft of target make Dex save or take half original damage." },
      { level: 11, name: "Shatter Slam", text: "Action: volley at 20-ft radius, Dex save or 4d8 bludgeoning. Once per short rest." },
      { level: 15, name: "Siege Mode", text: "Stone attacks ignore cover and have range 300 ft. Add CON modifier to number of stones thrown. Once per long rest: massive stone burst, 8d8 in 30-ft cone, push all creatures 15 ft." }
    ], note: "" },
    { id: "earth-shaker", name: "Earth Shaker", parentClass: "Gensarch", element: "Earth", summary: "A ground-shaking subclass that controls the battlefield through tremors and seismic force.", features: [
      { level: 3, name: "Tremor Step", text: "After moving 15 ft, bonus action quake: creatures within 5 ft make Dex save or fall prone and take 1d6 bludgeoning." },
      { level: 7, name: "Ground Control", text: "Action: 20 ft radius becomes difficult terrain; enemies move half speed, disadvantage on Strength checks." },
      { level: 11, name: "Seismic Shockwave", text: "Once per short rest: 15 ft cone slam, Strength save or 4d6 bludgeoning and knocked prone." },
      { level: 15, name: "Quaking Core", text: "Gain tremorsense 30 ft; creatures within 10 ft take Elemental Damage Die bludgeoning at turn start if touching the ground." }
    ], note: "" },
    { id: "earth-smith", name: "Earth Smith", parentClass: "Gensarch", element: "Earth", summary: "A subclass that summons magical stone weapons and armor from the ground to fight as a living siege engine.", features: [
      { level: 3, name: "Stoneforging", text: "Bonus action: summon magical weapon/armor from ground. Weapons are magical and count for resistance. Control floating weapons = Proficiency Bonus + Con modifier (armor creation reduces cap to Proficiency Bonus only). Floating weapons can move 30 ft and attack using bonus action." },
      { level: 7, name: "Guardian Armory", text: "Controlled weapons can make opportunity attacks when enemies move near them. Grant one floating weapon to ally within 30 ft to fight as if attuned." },
      { level: 11, name: "Weapon Dance", text: "Once per turn, bonus action: command all floating weapons to attack simultaneously, each dealing Elemental Damage Die." },
      { level: 15, name: "Living Arsenal", text: "Summon temporary golem-like form for 1 minute, merging with weapons. Gain +2 AC, resistance to nonmagical bludgeoning/piercing/slashing; each of your attacks strikes with a second weapon for +2d8 force." }
    ], note: "" },
    { id: "stone-shield", name: "Stone Shield", parentClass: "Gensarch", element: "Earth", summary: "A defensive subclass that summons floating stone shields to protect allies and control the battlefield.", features: [
      { level: 3, name: "Guardian Shields", text: "Bonus action: summon floating stone shields up to Proficiency Bonus in number; each grants +2 AC to you or ally within 30 ft." },
      { level: 7, name: "Reactive Wall", text: "Reaction: raise earth wall (5 ft wide, 10 ft tall) between attacker and target, providing three-quarters cover and absorbing 10 + Con mod damage before breaking." },
      { level: 11, name: "Shield Redirect", text: "Reaction when attacker misses ally protected by your shield: push attacker 10 ft away or knock prone." },
      { level: 15, name: "Fortress of Stone", text: "Action: 15 ft radius dome; allies inside gain +2 AC, resistance to all damage; enemies treat area as difficult terrain. Lasts 1 minute, once per long rest." }
    ], note: "" },
    { id: "deity-nightmare-sect", name: "Deity Nightmare Sect", parentClass: "Esper", antiDivine: true, summary: "Psionic warriors who hunt divine entities by stripping their powers, draining their mental acuity, and destroying their influence.", features: [
      { level: 3, name: "Divine Disruption", text: "Bonus action: target within 60 ft loses one chosen trait (Resistances, Immunities, Legendary Actions, or Innate Spellcasting) until end of its next turn. INT save DC 8+PB+INT; divine creatures disadvantage. Uses = PB per long rest." },
      { level: 3, name: "Psionic Memory Drain", text: "Reaction when creature within 30 ft makes INT/WIS/CHA check or save: INT save DC 8+PB+INT; fail = drain 1d6 from roll (1d8 at 10th) and gain 2x that as temp HP. Uses = INT modifier (min 1) per long rest." },
      { level: 6, name: "Divine Amnesia", text: "Action: creature within 60 ft makes WIS save DC 8+PB+INT; fail = forgets one ability/spell/action until end of your next turn. Divine creatures disadvantage. 2 uses per long rest (3 at 14th)." },
      { level: 10, name: "Mental Aegis", text: "Proficiency in INT/WIS/CHA saves if not already. Advantage on those saves vs divine abilities/spells." },
      { level: 14, name: "Mind Raze", text: "Action: target within 60 ft makes save using chosen mental attribute (INT/WIS/CHA) vs your Psionic Save DC; fail = attribute score reduced by 1d6+INT modifier until end of your next turn. Divine creatures take additional 1d6 reduction. Once per long rest." }
    ], note: "Previously extracted as 'God Eater' — this is the canonical sect name per the subclass list." },
    { id: "eye-of-eternity-sect", name: "Eye of Eternity Sect", parentClass: "Esper", summary: "Psions whose perception tears through illusions and reality, weaponizing sight to terrify and shatter enemies.", features: [
      { level: 3, name: "Sight Beyond the Veil", text: "Eternal Sight: expend 1 Psionic Energy die for See Invisibility + Detect Magic 1 minute; advantage on checks vs illusions/invisibility/auras. Gaze of Madness: action, creature within 60 ft INT save vs Psionic DC or psychic damage = 1 die + frightened until end of your next turn." },
      { level: 6, name: "Veil Piercer", text: "Eyes of the Abyss: bonus action, expend 2 Psionic Energy dice for True Seeing 10 minutes (no concentration). Reality Warp: reaction when attack targets you, attacker rolls 1d6 and subtracts from attack roll. Uses = INT modifier (min 1) per long rest." },
      { level: 10, name: "Tear the Veil", text: "Action: 30-ft radius sphere within 60 ft, 1 minute concentration. Each round, expend 1 die (bonus action) for one of: Gravity Shift (Str save or prone + can't stand), Mind Fracture (Wis save or disadvantage all saves until next turn), or Distorted Terrain (difficult terrain + disadvantage attacks inside). Once per long rest." },
      { level: 14, name: "Tear Through Reality", text: "Unfathomable Gaze: action, up to 3 creatures within 60 ft, INT save: fail = 4d10 psychic + frightened 1 min (Wis save each turn). Veil of Insanity: reaction to taking damage, expend 1 die, deal psychic = die+INT to attacker + disadvantage on their next save." },
      { level: 18, name: "Eye of the Eternal Void", text: "Gaze of Annihilation: action, 1 creature within 60 ft, Con save: fail = 10d10 psychic + stunned + frightened 1 min; success = half, not stunned, frightened until end of next turn. Once per long rest. Eternal Vigilance: immune to blinded; auto-succeed on saves vs charmed/frightened/controlled; creatures CR 1 or lower auto-frightened by direct eye contact." }
    ], note: "" },
    { id: "mind-ravager-sect", name: "Mind Ravager Sect", parentClass: "Esper", summary: "Psions who transfer their consciousness between bodies, wielding their mind as the ultimate weapon.", features: [
      { level: 3, name: "Thought Transfer", text: "Action: dominate creature within 30 ft, INT save DC 8+PB+INT mod, control up to 1 minute; your body unconscious. Use INT for attacks; can't use host's spells but can use psionic abilities. Once per long rest if target succeeds." },
      { level: 3, name: "Force Darts", text: "Action: shoot PB darts, each 1d8 force, 60 ft, bypass cover except full. Usable from any occupied body. Recharge short or long rest." },
      { level: 6, name: "Mind Ravage", text: "Reaction on reducing creature to 0 HP: contested INT save series (first to 5 wins). Win = permanently transfer consciousness; gain host's physical stats and memories, keep your mental stats and class features; prior body is lifeless husk. Lose = become floating orb (immune to nonmagical attacks, Force Darts only; die outright at 0 HP; can attempt takeover of CR 1 or lower)." },
      { level: 10, name: "Conscious Instinct", text: "Resistance to psychic damage; advantage vs charm/fright. When creature reads your thoughts, INT save DC 8+PB+INT; fail = 2d10 psychic and effect fails." },
      { level: 14, name: "Dominance Unleashed", text: "Action: 30-ft radius INT save DC 8+PB+INT; fail = stunned 1 minute (repeat save end of turn). Once per long rest." }
    ], note: "Previously extracted as 'Mind Ravager' under parentClass Psion — this is the canonical sect name." },
    { id: "order-of-hidden-hand", name: "Order of the Hidden Hand", parentClass: "Esper", activeRework: true, summary: "A secretive psionic order — details not present in the source document.", features: [], note: "NEEDS MANUAL REVIEW — this subclass is listed in the canonical list but has no content in the source document." },
    { id: "psionic-executioner-sect", name: "Psionic Executioner Sect", parentClass: "Esper", summary: "Psions who wage lethal mental duels, paralyzing enemies through battles of will and psychic force.", features: [
      { level: 3, name: "Mind Lock", text: "Action, concentration up to 2 rounds: target INT save vs Psionic DC; fail = drawn into mindscape for a mental duel (contested INT checks; spend Psionic Energy dice to add to your roll). Win 3 rounds: target loses 1d6 INT (restored after long rest) and is paralyzed 1 minute. Lose: you take 2d6 psychic per failed contest. Uses = INT modifier x2 (min 2) per long rest. Also gain proficiency with martial weapons and all armor; +1d6 psychic on melee attacks." },
      { level: 6, name: "Mental Fortress", text: "Resistance to psychic damage; advantage vs charmed/frightened. Advantage on contested INT checks while in Mind Lock." },
      { level: 10, name: "Executioner's Gambit", text: "When using Mind Lock, may initiate Executioner's Gambit — if you win the duel, target falls into a coma for 1 hour (unconscious, wakes only by Greater Restoration/Wish). On losing a Mind Lock, take only half psychic damage from failed contests." }
    ], note: "Higher-level features for this sect may exist in the source document but were not fully present in the extracted text." },
    { id: "blood-knight", name: "Blood Knight", parentClass: "Fighter", summary: "Fighters who drain power from enemy blood, healing themselves and ultimately controlling their foes.", features: [
      { level: 3, name: "Bloodthirsty Strikes", text: "On melee hit, chain blood to sword: 1d6 necrotic + regain HP = half damage. Each consecutive hit escalates die (1d6→1d8→1d10 max, then ends after 1 more round). Uses = proficiency bonus per long rest." },
      { level: 7, name: "Sanguine Control", text: "Action: target within 30 ft Con save DC 8+PB+CON; fail = paralyzed until end of your next turn. Once per short or long rest." },
      { level: 10, name: "Blood Shield", text: "When regaining HP from Bloodthirsty Strikes, gain temp HP equal to that amount instead, lasting 1 minute." },
      { level: 15, name: "Blood Puppet", text: "Action: target within 30 ft Con save DC 8+PB+CON; fail = you control it on its next turn (repeat save at end of each turn). Once per long rest." },
      { level: 18, name: "Blood Mastery", text: "Bloodthirsty Strikes dice double (2d6→2d8→2d10). Sanguine Control and Blood Puppet target two creatures instead of one. Immunity to necrotic; advantage vs paralyzed/stunned." }
    ], note: "" },
    { id: "dragon-knight", name: "Dragon Knight", parentClass: "Fighter", knighthoods: ["Knighthood of Inferno", "Knighthood of Tempest", "Knighthood of Verglas", "Knighthood of Elixir", "Knighthood of Decay", "Knighthood of Encephalon"], summary: "A fighter subclass divided into six Chromatic Dragon Knighthoods, each granting elemental powers tied to a chosen dragon type.", features: [
      { level: 3, name: "Draconic Heritage", text: "Choose Knighthood: Inferno (Red/Fire), Tempest (Blue/Lightning), Verglas (White/Cold), Elixir (Green/Poison), Decay (Black/Acid), Encephalon (Purple/Psychic). Permanent. HP max +1 per class level; resistance to chosen damage type. Dragon's Breath: action, 15-ft cone, Dex save DC 8+PB+CON, 4d8 damage with knighthood-specific secondary effect (scales to 6d8 at 10th, 10d8 at 18th). Uses = Con modifier, recharge long rest." },
      { level: 7, name: "Draconic Strength", text: "Critical hits on 19-20. On hit, deal +2d8 dragon-type damage (3d8 at 12th). Uses = proficiency bonus, recharge long rest." },
      { level: 10, name: "Dragon's Might", text: "Knighthood-specific passive effect on hit (Inferno: creatures within 5 ft take 1d6 fire; Tempest: 1d6 lightning to second target within 10 ft; Verglas: target has disadvantage on next attack; Elixir: Con save or poisoned 1 min; Decay: creatures within 5 ft take 1d6 acid; Encephalon: 1d4 psychic to all within 10 ft). +2 AC bonus regardless of armor." },
      { level: 15, name: "Draconic Transformation", text: "Action, 1-minute hybrid form. Fly speed 40 ft. Temp HP = 2x fighter level. +2d8 dragon-type on all attacks. Free Dragon's Breath use. Knighthood aura active. Once per long rest." },
      { level: 18, name: "Dragon's Fury", text: "On hit, deal +6d10 dragon-type damage. Uses = proficiency bonus, recharge long rest. STR and CON +2 (max 24). Dragon Transformation duration increases to 10 minutes." }
    ], note: "" },
    { id: "gravitorian", name: "Gravitorian", parentClass: "Fighter", summary: "Fighters who manipulate gravity to crush enemies, create shockwaves, and accelerate strikes to devastating speed.", features: [
      { level: 3, name: "Graviton Strike", text: "Gain Graviton Dice pool (d8s, equal to PB+CON modifier, recharge long rest). On melee hit, expend one die: Crushing Force (extra force damage, Str save or prone), Gravity Slash (extra force damage + speed -10 ft), or Critical Bonus (roll die twice on crit)." },
      { level: 7, name: "Gravity Crash", text: "On melee hit, expend 2 Graviton Dice: all chosen creatures within 10 ft of target Str save DC 8+PB+STR; fail = force damage (sum of dice) + pushed 10 ft; success = half, not pushed. Double damage if primary target drops to 0 HP. Uses = STR modifier (min 1) per long rest." },
      { level: 10, name: "Gravity Surge", text: "Bonus action, 1 minute: additional melee attack per Attack action; +1d8 force on melee attacks; advantage if moved 10+ ft toward target first. Once per short or long rest." },
      { level: 15, name: "Event Horizon", text: "Action: 60-ft radius centered on point within 120 ft, 1 minute. Start of each turn, chosen creatures Str save DC 8+PB+STR or restrained until start of next turn. Ranged attacks through area have disadvantage. Once per long rest." },
      { level: 18, name: "Singularity Strike / 1000 Blades", text: "Singularity Strike: action, one attack, expend 3 Graviton Dice, +8d10 force damage; creatures within 10 ft Str save or pushed + prone. Uses = STR modifier (min 1) per long rest. 1000 Blades Strike: expend all remaining Graviton Dice, +12d10 weapon-type damage to one target, counts as magical. Once per long rest." }
    ], note: "" },
    { id: "mortal-guardian", name: "Mortal Guardian", parentClass: "Fighter", antiDivine: true, summary: "Fighters who reject divine tyranny, becoming specialists in hunting celestials and rallying mortal allies against divine power.", features: [
      { level: 3, name: "Celestial Anathema", text: "Resistance to radiant and necrotic damage. Hunter's Mark vs Celestials: bonus action to mark, +1d6 force on attacks until end of next turn or target drops (2d6 at 10th)." },
      { level: 7, name: "Unyielding Resolve", text: "Divine Defiance: reaction grants self and allies within 30 ft advantage on saves vs celestial/divine abilities. Inspire Resistance: bonus action, up to 3 allies within 30 ft gain temp HP = fighter level until your next turn. Once per short or long rest." },
      { level: 10, name: "Godslayer's Will", text: "Ignore Resistance: once per turn, ignore nonmagical bludgeoning/piercing/slashing resistance on celestials (immunity at 18th). Aura of Mortal Fury: celestial/divine creature within 30 ft targeting you takes 2d8 psychic + disadvantage on next attack (Wis save DC 8+PB+WIS to negate). Uses = WIS modifier per long rest." },
      { level: 15, name: "Lion's Roar", text: "War Cry: action, allies within 30 ft gain advantage on next attack and add PB to saves vs divine effects until your next turn. Once per short or long rest. Divine Sight: see through divine illusions; auto-sense celestials within 60 ft." },
      { level: 18, name: "Pantheon's Bane", text: "Godslayer Strike: on hit vs celestial/divine, +4d10 force; Con save DC 8+PB+STR/DEX or stunned until end of your next turn. Once per turn. Wrath of Mortality: when dropping to 0 HP (not killed outright), drop to 1 HP instead; for 1 minute crits vs celestials on 19-20. Once per long rest." }
    ], note: "" },
    { id: "valkyrie", name: "Valkyrie", parentClass: "Fighter", summary: "Lightning-fast warriors of unmatched speed who evade attacks and deliver devastating rapid strikes.", features: [
      { level: 3, name: "Swift Strikes", text: "One additional attack as part of Attack action. Movement speed +10 ft." },
      { level: 7, name: "Evasive Maneuver", text: "Reaction: when attacker you can see hits you, impose disadvantage on that attack roll. Uses = proficiency bonus per long rest." },
      { level: 10, name: "Unstoppable Force", text: "On melee hit, deal additional weapon damage die. Uses = proficiency bonus per short or long rest." },
      { level: 15, name: "Blinding Speed", text: "Take two reactions per round. When taking Dash action, opportunity attacks against you have disadvantage until your next turn." },
      { level: 18, name: "Master of Evasion", text: "Advantage on Dex saves. When attacker misses you, reaction to make one melee attack against them. Movement speed +10 ft additional (total +20 ft)." }
    ], note: "(Only female characters can use this subclass, per the source document.)" },
    { id: "dancing-flames", name: "Dancing Flames", parentClass: "Gensarch", element: "Fire", summary: "A tactical melee subclass that chains Flame Tactics for escalating fire damage and critical hit threats.", features: [
      { level: 3, name: "Flame Tactics", text: "On melee hit, apply one tactic per turn: Trip (Str save or prone), Push (Str save or pushed 10 ft), or Lick (target takes 1d6 fire at start of its next turn)." },
      { level: 7, name: "Ember Step", text: "Movement leaves 5-ft wide flame trail; enemies take 1d8 fire per 5 ft moved through." },
      { level: 11, name: "Kindling Fury", text: "Each active Flame Tactic adds +2 fire damage to next attack. At 3 active tactics, attacks crit on 19-20." },
      { level: 15, name: "Flame Waltz", text: "Once per turn on reducing creature to 0 HP, teleport 30 ft and make another melee attack as part of same action." }
    ], note: "" },
    { id: "devouring-flames", name: "Devouring Flames", parentClass: "Gensarch", element: "Fire", summary: "A fire subclass focused on consuming enemies with passion-fueled flame bursts and area explosions.", features: [
      { level: 3, name: "Passion Burn", text: "Spend 1 Passion Die (1d10) for extra damage; enemies make Wisdom save or gain disadvantage on attacks against others. Passion Dice = proficiency bonus, refresh on short rest." },
      { level: 7, name: "Flame Expansion", text: "Action: 15 ft cone, Dex save, 6d6 fire damage (half on success). Scales to 30/60 ft and 8d6/10d6." },
      { level: 11, name: "Infernal Bloom", text: "When spending a Passion Die, all creatures within 10 ft take 2d10 fire damage, no save." },
      { level: 15, name: "Burnout Burst", text: "Once per long rest, expend all Passion Dice; creatures within 30 ft take 1d10 per die + Elemental Damage Die." }
    ], note: "" },
    { id: "electric-flames", name: "Electric Flames", parentClass: "Gensarch", element: "Fire", summary: "A subclass that converts fire into lightning energy, arcing to multiple targets and paralyzing enemies.", features: [
      { level: 3, name: "Searing Surge", text: "Choose to deal lightning instead of fire for any elemental attack or Genn feature. On lightning hit, roll 1d6: on 6, target is shocked, granting advantage on your next attack against them." },
      { level: 7, name: "Arc Flash", text: "Once per turn on lightning hit, a second creature within 10 ft takes half the original damage." },
      { level: 11, name: "Paralytic Flame", text: "On lightning damage, target makes Con save or paralyzed until end of its next turn. Once per turn per creature." },
      { level: 15, name: "Living Voltage", text: "Resistance to lightning and fire. Once per long rest, activate Overcharge 1 minute: attacks deal +1d6 lightning; creatures within 10 ft take 1d6 lightning automatically at start of their turn." }
    ], note: "" },
    { id: "flames-of-life", name: "Flames of Life", parentClass: "Gensarch", element: "Fire", summary: "A subclass that channels flame for healing, restoration, and resurrection.", features: [
      { level: 3, name: "Healing Flame", text: "Spend a Genn Die to heal creature within 30 ft for roll + Charisma modifier instead of dealing damage." },
      { level: 7, name: "Warm Ember", text: "Allies within 10 ft regain 1 HP each turn if unconscious; once per long rest revive dead creature with 1 HP." },
      { level: 11, name: "Mass Ignite Heal", text: "Once per long rest, up to 20 creatures within 60 ft regain 2d6+Cha HP and gain fire resistance for 1 minute." },
      { level: 15, name: "Phoenix Core", text: "On reaching 0 HP, explode healing allies 3d10 and dealing 3d10 fire to enemies; return with Genn Die+Cha HP. Once per long rest." }
    ], note: "" },
    { id: "elamesta", name: "Elamesta", parentClass: "Gensarch", narrativeUnique: true, element: "Elamesta", summary: "The rarest Gensharch form — an elemental convergence who freely blends features from all four elements.", features: [
      { level: 3, name: "Elemental Fusion", text: "Roll 1d100 at character creation; on 15 or lower, born as Elamesta (cannot be chosen otherwise). Choose one Level 3 feature from any elemental subclass path. Also choose one fighting style (Gust Fighting, Firmed Art, Blazed Hand, or Flow Combat). Elemental Damage Die can be any elemental type; switch element and resistances on long rest." },
      { level: 7, name: "Adaptive Form", text: "Choose one Level 7 feature from a different elemental path. Gain resistance to a second elemental type from that path. Advantage on saves vs effects of that element." },
      { level: 11, name: "Elemental Mastery", text: "Choose one Level 11 feature from a third elemental path. Use Genn Dice as any elemental type freely. On natural 20 attack, trigger two elemental effects at once." },
      { level: 15, name: "Elemental Hybridization", text: "Choose final Level 15 feature from the fourth path. Access all four elemental subclass features (one per level tier). Switch any feature to another element's same-level feature on short rest. Once per short rest, activate two different-element features in one turn." },
      { level: 18, name: "Storm of the Fourfold Soul", text: "Once per long rest, 1-minute 60-ft radius elemental storm: each turn choose two elements, deal 6d8 of each to enemies (Dex save half); include Water/Flames of Life to also heal allies 4d6. Terrain becomes difficult. Gain fly speed 80 ft. Use one subclass ability per chosen path as bonus action or reaction." },
      { level: 20, name: "Avatar of Convergence", text: "Genn Dice become d8s. Two Elemental Damage Dice per turn. Always under effects of all four fighting styles. Resistance becomes immunity to any two chosen elements, resistance to all others." }
    ], note: "Elamesta cannot be chosen — it is randomly determined at character creation on a 1d100 roll of 15 or lower." },
    { id: "way-of-the-divine-bane", name: "Way of the Divine Bane", parentClass: "Monk", antiDivine: true, summary: "Monks who master ki techniques to resist, weaken, and banish divine and celestial powers.", features: [
      { level: 3, name: "Celestial Antipathy", text: "Melee attacks deal +1d6 radiant/necrotic to celestials/fiends/divine creatures (2d6 at 11th). Cast Detect Evil and Good without ki a number of times equal to Wisdom modifier per long rest." },
      { level: 6, name: "Aura of Defiance", text: "Gain resistance to radiant and necrotic damage. Disruptive Ki: reaction when celestial/fiend/divine creature within 30 ft casts a spell or uses magical ability, spend 2 ki; creature makes Wisdom save DC 8+PB+WIS or loses the spell/ability and can't cast or use magical abilities until start of its next turn." },
      { level: 11, name: "Celestial Shatter", text: "Once per turn on hit vs celestial/fiend/divine creature with unarmed strike, channel ki: creature makes Con save DC 8+PB+WIS or stunned until end of your next turn + disadvantage on WIS/CHA saves until end of its next turn. Uses = Wisdom modifier per long rest." },
      { level: 17, name: "Godslayer's Aura", text: "Godslayer's Wrath: divine creatures starting turn within 30 ft make Wisdom save DC 8+PB+WIS or take 3d10 radiant/necrotic and lose resistance/immunity to it until end of next turn. Divine Banishment: 5 ki action, creature makes Charisma save DC 8+PB+WIS or banished to home plane for 24 hours. Once per long rest." }
    ], note: "" },
    { id: "way-of-purity", name: "Way of Purity", parentClass: "Monk", summary: "Monks who take sacred vows of purity, becoming radiant holy warriors who ascend to celestial transformation.", features: [
      { level: 3, name: "Purity Palm", text: "Spend 1+ ki on unarmed strike: deal radiant instead of bludgeoning +1d6 radiant per ki spent. Vs undead/fiends/corrupted: double radiant damage + Con save or blinded until end of your next turn. Strikes count as holy weapons." },
      { level: 3, name: "Invincible Virgin: First Refinement", text: "While maintaining all five Sacred Vows: AC +2, resistance to necrotic damage, advantage vs charmed/frightened." },
      { level: 6, name: "Sacred Hand Signs", text: "Action, ki cost: Cleansing Light (1 ki, 100-ft line 5 ft wide, Dex save, 6d6 radiant, undead/fiends disadvantage), Banishment Seal (2 ki, fiend/undead/celestial within 30 ft Cha save or banished 1 min; CR 1/2 or lower instantly destroyed), Lotus Barrier (1-3 ki, +2/+4/+4 AC until next turn, at 3 ki also resistance all except force)." },
      { level: 11, name: "Invincible Virgin: Second Refinement", text: "AC bonus becomes +3; body gains celestial steel texture; resistance to radiant damage; melee attackers take WIS modifier radiant; Purity Palm deals +1d8 instead of +1d6. Seal of Seven Petals: 3 ki action, place on creature within 5 ft 1 min; -15 ft speed, disadvantage attacks vs you/allies; evil targets also disadvantage all saves; Purity Palm hits flare 2d8 radiant." },
      { level: 17, name: "Purest Form: The Six-Winged Ascendant", text: "6 ki bonus action, 1 minute: fly 120 ft, bright light 30-ft radius, immunity radiant/necrotic, resistance all other damage. Unarmed strikes +3d10 radiant, ignores resistance/immunity, undead/fiends take max damage. Purifying Nova (once/transform): action, 30 ft radius Con save, 10d10 radiant, blinded 1 min, evil creatures banished 1 min on fail." }
    ], note: "Five Sacred Vows: Chastity, No Unclean Food, No Alcohol, No Deals with Unclean Spirits, No Killing out of Hate. Willingly breaking a vow removes subclass features until 3-day cleansing ritual." },
    { id: "way-of-absolute-flow", name: "Way of the Absolute Flow", parentClass: "Monk", summary: "Monks who perceive ki meridians in all creatures and sever their abilities, drain their power, and stop time itself.", features: [
      { level: 3, name: "Eyes of Absolute Flow", text: "Meridian Sight: see ki pathways in creatures within 60 ft — know source of power (class/subclass/magic), advantage on Insight/Perception, learn highest ability modifier and resistances/vulnerabilities, see invisible creatures as glowing outlines. Flow Disruption: on unarmed hit, spend 1 ki, Con save or target loses reactions until next turn + -10 ft speed + disadvantage on next attack." },
      { level: 3, name: "Absolute Flow Palm", text: "Action or bonus action: unarmed strike dealing Martial Arts die + WIS force damage. Spend 1-3 ki for +1 Martial Arts die per point. If Con save fails: poisoned until end of your next turn." },
      { level: 6, name: "Meridian Breaker Techniques", text: "Break the Talent: on 2+ hits same turn, spend 3 ki, creature Con save — fail = one chosen feature (class feature, subclass feature, spellcasting, magical trait, or legendary action) disabled until end of your next turn. 5 ki = disabled 1 minute (save ends each turn). Internal Rupture: on Absolute Flow Palm force damage, Con save — fail = +1 Martial Arts die internal bleeding + prone or stunned until end of next turn (your choice, once per turn)." },
      { level: 11, name: "Flow Absorption", text: "Ki Drain: reaction + 2 ki when creature within 30 ft spends spell slots/ki/sorcery points/rage/superiority dice — gain temp HP = WIS+monk level, +10 ft movement, next attack deals +WIS force damage; on spell slot stolen gain 1 ki back. Life-Stealing Flow: once per turn on unarmed hit, spend 1 ki to regain HP equal to damage dealt." },
      { level: 17, name: "Absolute Stasis", text: "Action, 8 ki: stop time for 1 round (like Time Stop but always 4 extra turns). During Stasis: +2 AC, advantage all attacks, movement doubled, one free Absolute Flow Palm per extra turn. Thousand-Vein Assault (once per Stasis): 10 unarmed strikes as one action, each +1 Martial Arts die force damage — all land simultaneously when time resumes; Con save or paralyzed + all features disabled + speed 0 + disadvantage all saves for 1 round." }
    ], note: "" },
    { id: "way-of-the-flaming-soul", name: "Way of the Flaming Soul", parentClass: "Monk", summary: "Channel primal fire and lightning through your soul, empowering unarmed strikes and absorbing elemental energy.", features: [
      { level: 3, name: "Soulfire Initiate", text: "Bonus action: unarmed strikes deal +1d8 fire or lightning damage; increases to 1d10 at level 17." },
      { level: 3, name: "Elemental Absorption", text: "Reaction: when targeted by a fire or lightning spell, absorb it — heal for half damage instead of taking it." },
      { level: 6, name: "Elemental Breath", text: "Fire Breath: action, 15-ft cone, Dex save, 10d8 fire (half on success). Lightning Breath: action, 30-ft line 5 ft wide, Dex save, 10d8 lightning (half on success). Uses = Wisdom modifier per long rest. Damage type increases to 6d8 at 15th." },
      { level: 11, name: "Soulfire Healing", text: "Action: absorb fire or lightning from environment, regain HP = 1d10 + monk level. Uses = Wisdom modifier (min 1) per long rest." },
      { level: 17, name: "Soulfire Mastery", text: "Passion Strikes: all attacks ignore fire and lightning resistance; immunity treated as resistance. Focused Elemental Strike: action, choose Paralyzing Strike — on melee hit, +6d10 lightning damage; target makes Con save or paralyzed 1 minute (save repeats end of turn)." }
    ], note: "" },
    { id: "way-of-graceful-warrior", name: "Way of the Graceful Warrior", parentClass: "Monk", summary: "Monks who redirect enemy force using elemental grace, turning opponents' attacks against them.", features: [
      { level: 3, name: "Aspect of Grace", text: "Grace Charges pool = WIS modifier + PB, recharge short or long rest. Graceful Movement: when missed by melee, reaction + 1 Grace Charge to move 15 ft no OA; if ending within 5 ft of creature, may swap places redirecting the attack. Grace Incarnate: choose Aspect (Fire/Water/Air/Lightning/Radiance/Ice) for damage type and special Grace options." },
      { level: 6, name: "Redirection Mastery", text: "When creature within 30 ft makes an attack, spend 2 Grace Charges + reaction to redirect it to another creature within 30 ft of attacker. Also gain resistance to chosen Aspect's damage type." },
      { level: 11, name: "Flowing Grace", text: "When spell targets you or ally within 10 ft, spend 3 Grace Charges + reaction to redirect it to new target within range. May make one unarmed strike as part of the same reaction." },
      { level: 17, name: "Avatar of Grace", text: "Bonus action, 4 Grace Charges, 1 minute: 30-ft elemental aura; attacks vs aura allies can be redirected to enemies; Aspect-specific powers active. Once per long rest (or 6 Grace Charges for additional uses)." }
    ], note: "Grace Incarnate aspect options each have unique 2-charge and 3-charge techniques. See source for full Aspect tables." },
    { id: "way-of-the-oni", name: "Way of the Oni", parentClass: "Monk", summary: "Monks who channel the dark power of oni through shapeshifting, necrotic strikes, and terrifying transformation.", features: [
      { level: 3, name: "Oni's Might", text: "Unarmed strikes deal +PB damage (can deal necrotic instead of bludgeoning). Shapeshift: bonus action, grow claws (1d6 slashing), fangs (1d8 piercing), or horns (1d10 piercing) for 1 minute; +10 ft movement and advantage on Intimidation." },
      { level: 6, name: "Oni's Resilience", text: "Resistance to necrotic damage. Oni Hide: +2 AC while unarmored and without shield." },
      { level: 11, name: "Oni's Fury", text: "Fury of the Oni: on unarmed hit, spend 2 ki, Con save DC 8+PB+WIS: fail = +3d10 necrotic + frightened until end of your next turn. Oni's Roar: action, 3 ki, all within 30 ft Wis save DC 8+PB+WIS or frightened 1 minute (repeat save each turn)." },
      { level: 17, name: "Oni's Transformation", text: "Action, 5 ki, 1 minute: size Large (if not already); temp HP = 2x monk level; unarmed strikes +1d10 necrotic; advantage Str checks/saves; Shapeshift usable at will without bonus action cost." }
    ], note: "" },
    { id: "way-of-the-raging-fist", name: "Way of the Raging Fist", parentClass: "Monk", summary: "Monks who master inner fury through discipline, channeling rage into powerful, controlled combat techniques.", features: [
      { level: 3, name: "Furious Strikes", text: "Unarmed strikes deal +1d6 damage (1d8 at 6th, 1d10 at 11th, 1d12 at 17th); usable Monk level times per long rest." },
      { level: 6, name: "Controlled Fury", text: "Spend 3 ki as bonus action to enter Brooding Fury for 1 minute; choose one effect per turn: stun (Con save DC 8+Str+Prof), prone (Str save), disadvantage on next attack (Con save), or +1d10 magical bludgeoning." },
      { level: 11, name: "Focused Fury", text: "Bonus action, 3 ki, 1-minute rage: advantage on STR checks/saves; unarmed strikes can be Reckless Attacks (advantage to hit, attacks against you have advantage until next turn); resistance to nonmagical bludgeoning/piercing/slashing. Patient Defense usable without ki = proficiency bonus times per long rest." },
      { level: 17, name: "Avatar of Rage", text: "Action, 5 ki, 1 minute: resistance to all damage; unarmed strikes deal +4d6; on reducing creature to 0 HP with unarmed strike, make another unarmed strike as bonus action; immune to charmed/frightened." }
    ], note: "" },
    { id: "way-of-the-tempest", name: "Way of the Tempest", parentClass: "Monk", summary: "Monks of the Tempest harness storm energy, using lightning and thunder techniques to devastate enemies.", features: [
      { level: 3, name: "Storm Strike", text: "Unarmed strikes deal lightning damage instead of bludgeoning; count as magical." },
      { level: 3, name: "Tempest Meditation", text: "10 minutes meditation grants resistance to lightning and thunder damage for 24 hours." },
      { level: 6, name: "Thunderous Step", text: "Spend 1 ki, teleport 30 feet; creatures within 15 feet make Constitution save or take Martial Arts die + Wisdom modifier thunder damage." },
      { level: 6, name: "Lightning Reflexes", text: "Advantage on Dexterity saving throws against effects you can see." },
      { level: 11, name: "Storm Aura", text: "Spend 3 ki; 10-foot aura 1 minute; allies gain lightning/thunder resistance; enemies take Wisdom modifier lightning damage per turn." },
      { level: 11, name: "Tempest Wings", text: "Flying speed equal to walking speed for 10 minutes. Once per long rest." },
      { level: 17, name: "Tempest Strike", text: "Action, 5 ki: lightning bolt at point within 120 ft, 20-ft radius. Dex save; fail = 10d6 lightning + 6d8 thunder + stunned + knocked prone until end of your next turn; success = half, not stunned." },
      { level: 17, name: "Storm's Ascent", text: "Immunity to lightning and thunder damage. Tempest Wings usable at will." }
    ], note: "" },
    { id: "oath-of-heavenly-flame", name: "Oath of Heavenly Flame", parentClass: "Paladin", summary: "Paladins who wield celestial flames to destroy evil and protect the innocent as living embodiments of divine fire.", features: [
      { level: 3, name: "Oath Spells", text: "Level 3: Burning Hands, Searing Smite. Level 5: Flame Blade, Scorching Ray. Level 9: Fireball, Beacon of Hope. Level 13: Wall of Fire, Death Ward. Level 17: Flame Strike, Holy Weapon." },
      { level: 3, name: "Channel Divinity: Blazing Smite", text: "Bonus action: infuse weapon with celestial flames 1 minute; next hit deals +3d8 fire; target makes Con save DC 8+PB+CHA or blinded until end of its next turn." },
      { level: 3, name: "Channel Divinity: Cleansing Flame", text: "Action: 20-ft radius Dex save; fail = 3d10+Cha fire damage; success = half; allies in area regain HP = Cha modifier." },
      { level: 7, name: "Aura of Heavenly Flame", text: "20-ft radius (30 ft at 18th). Hostile creatures starting turn in aura take fire damage = Cha modifier. Allies gain fire resistance and advantage vs frightened." },
      { level: 15, name: "Inferno Vanguard", text: "Firebrand Smite: on hit deal +6d8 fire; if reduced to 0 HP, flames leap to creature within 10 ft for half damage. Uses = Cha modifier, long rest. Flames of Renewal: when you deal fire damage, regain HP = half, once per turn. Unstoppable Flames: fire ignores resistance, treats immunity as resistance." },
      { level: 20, name: "Avatar of the Heavenly Flame", text: "Action, 1-minute transformation. Wreathed in Flames: hostile creatures ending turn within 10 ft take 2d8 fire. Empowered Strikes: +3d8 fire, magical. Infernal Burst: bonus action, 30-ft Dex save DC 8+PB+CHA, fail = 6d10 fire. Fire's Blessing: you and allies within 30 ft immune to fire, resistance to all other damage. Once per long rest." }
    ], note: "" },
    { id: "oath-of-necrosis", name: "Oath of Necrosis", parentClass: "Paladin", summary: "Paladins who enforce divine retribution by raising the dead as allies and binding souls to serve justice.", features: [
      { level: 3, name: "Oath Spells", text: "3rd: Inflict Wounds, Cause Fear; 5th: Animate Dead, Silence; 9th: Vampiric Touch, Revivify; 13th: Blight, Guardian of Faith; 17th: Cloudkill, Raise Dead." },
      { level: 3, name: "Channel Divinity: Chains of Atonement", text: "Action: CHA modifier (min 1) creatures within 30 ft make Str save DC 8+PB+CHA or restrained 1 min; take necrotic = CHA modifier at start of turns while restrained (repeat save ends)." },
      { level: 3, name: "Channel Divinity: Soulbound Minion", text: "Action: raise corpse within 30 ft as skeleton/zombie under your control for 1 minute. Uses = CHA modifier (min 1) per long rest." },
      { level: 7, name: "Necrotic Blade", text: "Bonus action: summon spectral Necrotic Blade (any melee form) as magical weapon dealing +2d8 necrotic or radiant (your choice), lasting 1 minute. Divine Smite may deal necrotic (ignores resistance; immunity = half damage instead)." },
      { level: 7, name: "Death's Smite", text: "When Divine Smite hits creature below half HP, +1d8 necrotic. If reduced to 0 HP, rises as specter under your control for 1 minute." },
      { level: 15, name: "Undead Vanguard", text: "Soulbound Minion remains indefinitely (until destroyed/dismissed). Aura of Undeath (30 ft): your undead gain resistance to radiant damage and temp HP = CHA modifier at start of their turns. Control up to 4 undead at once." },
      { level: 20, name: "Avatar of Death", text: "Action, 1 minute: Necrotic Reaper — Necrotic Blade deals +3d8 necrotic; each kill raises specter under your control 1 minute. Aura of Dread (30 ft) — enemies Wis save or frightened until start of next turn. Gravewalker — immunity to necrotic; resistance to nonmagical physical damage; levitate up to 5 ft; +20 ft movement. Once per long rest." }
    ], note: "" },
    { id: "oath-of-renewal", name: "Oath of Renewal", parentClass: "Paladin", summary: "Paladins devoted to transformation and redemption who restore the fallen, mend corruption, and turn fiends to celestials.", features: [
      { level: 3, name: "Oath Spells", text: "3rd: Sanctuary, Healing Word; 5th: Lesser Restoration, Calm Emotions; 9th: Revivify, Aura of Vitality; 13th: Blight (reflavored as purifying decay), Death Ward; 17th: Greater Restoration, Mass Cure Wounds." },
      { level: 3, name: "Channel Divinity: Offer of Renewal", text: "Action: target hostile/corrupted creature within 30 ft (fiend, undead, infernal, cursed, or dominated), Cha save: fail = charmed 1 min (can't attack/cast hostile spells; becomes aware of its corruption if capable of speech). Ends early if you/allies deal damage. Success = disadvantage on next attack or save before end of its next turn." },
      { level: 3, name: "Channel Divinity: Renew the Fallen", text: "Action: choose up to 3 creatures within 30 ft that are unconscious/dying/paralyzed/petrified/cursed/dropped to 0 HP in last minute. Each regains HP = 2d10 + paladin level, loses one condition, gains advantage on saves until end of next turn. Undead targeted must make Wis save or be stunned until end of next turn instead." },
      { level: 7, name: "Aura of Renewal", text: "10 ft (30 at 18th). Allies regain HP = Cha modifier at start of turn if below half HP. Advantage on death saves. Cannot be frightened. Undead/fiends/infernals in aura: disadvantage on attacks, can't regain HP via harmful means." },
      { level: 15, name: "Reclamation Strike", text: "On Divine Smite hit, choose Reclamation Smite instead: deal half radiant damage; target makes Cha save. Fail: undead becomes alive (humanoid at 1 HP stable) at end of next turn; fiend/infernal becomes celestial (loses infernal traits, alignment shifts good). Success = immune to this feature 1 week." },
      { level: 20, name: "Avatar of Renewal", text: "Action, 1 minute: spectral wings (fly 90 ft), regain 20 HP at start of each turn. Aura of Rebirth (40 ft): allies dropping to 0 HP immediately stand at 1 HP (once per creature); death saves auto-succeed; allies gain resistance to necrotic/radiant. Final Renewal: once this transformation, action — any willing/incapacitated creatures within 30 ft: undead restored to life, fiends/infernals become celestials, cursed souls cleansed (based on curse tier). Creatures retain free will. Once per long rest." }
    ], note: "" },
    { id: "oath-of-soul-destruction", name: "Oath of Soul Destruction", parentClass: "Paladin", summary: "Paladins who utterly destroy evil down to the soul itself, ensuring no resurrection and no escape from judgment.", features: [
      { level: 3, name: "Channel Divinity: Soul Sunder", text: "Action: creature within 30 ft makes Wis save DC 8+PB+CHA; fail = 2x paladin level radiant damage + cannot be resurrected except by Wish; success = half, can be resurrected." },
      { level: 3, name: "Channel Divinity: Ethereal Shield", text: "Bonus action: +2 AC and resistance to necrotic damage for 1 minute." },
      { level: 7, name: "Aura of Annihilation", text: "10 ft (30 ft at 18th). You and allies deal extra radiant = CHA modifier (min 1) on weapon hits." },
      { level: 15, name: "Soul Reaver", text: "On melee hit, deal +2d8 radiant. If target reduced to 0 HP, its soul is destroyed (no resurrection except Wish)." },
      { level: 20, name: "Avatar of Oblivion", text: "Action, 1 minute: resistance to all damage; weapon attacks +3d8 radiant; reduces to 0 HP = soul destroyed (no resurrection except Wish); 30-ft fear aura Wis save or frightened 1 min (repeat save). Once per long rest." }
    ], note: "" },
    { id: "oath-of-the-arcane", name: "Oath of the Arcane", parentClass: "Paladin", summary: "A paladin who swears to protect the weave of magic, balance arcane power, and inspire wonder in others.", features: [
      { level: 3, name: "Oath Spells", text: "Gain oath spells at listed levels; may also choose wizard spells for your spell list." },
      { level: 3, name: "Channel Divinity: Arcane Smite", text: "On hit with melee attack, use Channel Divinity to deal 2d8 + Charisma modifier force damage." },
      { level: 3, name: "Channel Divinity: Spellbreaker", text: "Action: use Channel Divinity to end one spell on yourself or one touched willing creature." },
      { level: 7, name: "Aura of Arcana", text: "You and friendlies within 10 feet have advantage on saving throws vs spells; 30 feet at 18th level." },
      { level: 15, name: "Arcane Mastery", text: "Cast any wizard spell of 4th level or lower without a spell slot once per long rest." },
      { level: 20, name: "Avatar of Magic", text: "1-minute transformation: resistance to spell damage; add Charisma modifier to paladin spell damage." }
    ], note: "" },
    { id: "oath-of-the-god-slayer", name: "Oath of the God Slayer", parentClass: "Paladin", antiDivine: true, summary: "Paladins sworn to Death itself, dedicated to destroying gods and freeing mortals from divine control.", features: [
      { level: 3, name: "Oath Spells", text: "Level 3: Inflict Wounds, Protection from Evil and Good. Level 5: Ray of Enfeeblement, Magic Weapon. Level 9: Vampiric Touch, Spirit Guardians. Level 13: Blight, Death Ward. Level 17: Destructive Wave, Anti-Life Shell." },
      { level: 3, name: "Channel Divinity: Mark of Mortality", text: "Action: curse creature within 30 ft for 1 minute. It cannot regain HP, has disadvantage on saves vs frightened/paralyzed, and takes +1d8 necrotic from all sources (2d8 vs celestials)." },
      { level: 3, name: "Channel Divinity: Siphon Vitality", text: "Bonus action: draw life from creature within 30 ft with < half HP. It takes necrotic = 2x paladin level; you regain that much HP." },
      { level: 7, name: "Aura of Dread", text: "10-ft aura (30 ft at 18th). Celestials/divine creatures have disadvantage on attacks vs creatures in aura. Creatures starting turn in aura take necrotic = Cha modifier. You and allies gain radiant resistance." },
      { level: 15, name: "Relentless Mortal Will", text: "When reduced to 0 HP but not killed outright, drop to 1 HP instead. While at 1 or fewer HP, gain temp HP = Cha modifier (min 1) at start of each turn. Recharges on short or long rest." },
      { level: 17, name: "Oblivion's Smite", text: "Divine Smite option: deals necrotic, ignores resistance/immunity. +3d8 necrotic vs celestials/fiends; target makes Con save DC 8+PB+CHA or HP max reduced by total smite damage until Greater Restoration." },
      { level: 20, name: "Death's Avatar", text: "1-minute transformation: immune to necrotic, attacks bypass necrotic resistance/immunity. Aura of Dread expands to 60 ft with Wisdom save DC 8+PB+CHA or frightened; frightened creatures take 4d8 necrotic/turn in aura. Oblivion's Smite grants temp HP = damage dealt. Once per long rest." }
    ], note: "" },
    { id: "order-of-the-mender", name: "Order of the Mender", parentClass: "Esper", summary: "A healer-empath subclass that mends wounds and minds while manipulating emotions on the battlefield.", features: [
      { level: 3, name: "Pulse of Relief", text: "Bonus action, expend 1 Psionic Energy die; target within 30 ft regains HP = die + INT modifier, plus temp HP = half Psion level; ends frightened/charmed conditions." },
      { level: 5, name: "Empathic Reversal", text: "Reaction: expend 1 Psionic Energy die to redirect emotion condition to new target within 60 ft; WIS save or suffer same condition; fail by 5+ also staggered." },
      { level: 7, name: "Sympathetic Link", text: "Action, expend 1 die; link with willing creature within 30 ft for 1 minute; split damage, redirect healing; one link at a time." },
      { level: 9, name: "Echo of Empathy", text: "When casting psionic healing on a creature, expend 1 Psionic Energy die to echo healing to another target within 30 ft: second target regains HP = half die + INT modifier. If both targets are below 50% HP, both receive the full amount." },
      { level: 11, name: "Laughter of the Damned", text: "When creature fails save vs your emotion effect, expend 1 die; it laughs/sobs/shrieks uncontrollably; creatures within 10 ft make Wisdom save or are also affected until end of their next turn." },
      { level: 13, name: "Surge of Serenity", text: "Action, 2 dice, 30-ft Charisma save. Allies on success: calm emotions + remove one negative condition. Enemies on failure: calm emotions effect + disadvantage on next saving throw." },
      { level: 15, name: "Soul Stitcher", text: "Reaction when creature within 60 ft drops to 0 HP, expend 2 dice; restore to consciousness with HP = sum of dice + INT modifier. If under fear/charm/despair, creature stands automatically with advantage on attacks until end of next turn." }
    ], note: "" },
    { id: "deity-hunter-conclave", name: "Deity Hunter Conclave", parentClass: "Ranger", antiDivine: true, summary: "A ranger who hunts divine beings, piercing celestial defenses and turning divine powers against oppressive gods and celestials.", features: [
      { level: 3, name: "Divine Nemesis", text: "Choose Celestials, Fiends, or Aberrations; gain tracking advantage and +2d6 (4d6 at 11th) radiant/necrotic damage against them." },
      { level: 3, name: "Sacred Sight", text: "Cast Detect Evil and Good at will; darkvision 120 ft; see through magical darkness, invisibility, and illusions." },
      { level: 7, name: "Divine Resistance", text: "Resistance to radiant/necrotic damage; immune to charm/fright from chosen type; reaction grants advantage on saves (uses = proficiency bonus per long rest)." },
      { level: 11, name: "Vengeful Strike", text: "On hit vs chosen type, force Con save DC 8+PB+WIS; fail = stunned until end of your next turn + 3d6 psychic damage. Uses = Wisdom modifier (min 1) per short or long rest." },
      { level: 15, name: "Godslayer's Fury", text: "On hit vs chosen type, deal +10d6 radiant or necrotic. If reduced to 0 HP: utterly annihilated, no corpse, no resurrection < Wish. Divine Fear: creatures of chosen type within 30 ft make Wisdom save or frightened 1 minute. Final Stand: until end of next turn, resistance to all damage, chosen-type creatures have disadvantage on attacks against you. Once per long rest." }
    ], note: "" },
    { id: "head-hunter-conclave", name: "Head Hunter Conclave", parentClass: "Ranger", summary: "A ranger specialized in tracking, stealth, and high-damage ranged precision attacks.", features: [
      { level: 3, name: "Shadow Tracker", text: "Gain Investigation and Stealth proficiency; track any creature type; sense presence of creatures within 1 mile." },
      { level: 3, name: "Twin Shot", text: "When taking Attack action with ranged weapon, shoot two arrows; make two attack rolls, each deals normal damage." },
      { level: 7, name: "Veil of Shadows", text: "Action: invisible 1 minute, advantage on attacks, enemies have disadvantage against you. Recharge on short or long rest." },
      { level: 11, name: "Deadly Precision", text: "Attacks against tracked creatures deal +1d8 damage. If you have advantage on an attack roll, you may reroll one die once." },
      { level: 15, name: "Multi-Arrow Mastery", text: "Twin Shot fires 3 arrows instead of 2; three attack rolls, each deals normal damage. Arrows ignore nonmagical resistance." },
      { level: 18, name: "Assassin's Strike", text: "Hitting a surprised creature is an automatic critical hit. Add Wisdom modifier to damage of this attack." }
    ], note: "" },
    { id: "shadowy-arrow-conclave", name: "Shadowy Arrow Conclave", parentClass: "Ranger", summary: "A shadow-wielding archer who summons a necrotic bow and debilitates enemies from darkness.", features: [
      { level: 3, name: "Shadow Bow", text: "Bonus action: summon magical Shadow Bow dealing necrotic damage. On hit, target makes Con save DC 8+PB+WIS or has disadvantage on next attack roll. Bow vanishes if more than 5 ft away for 1 minute." },
      { level: 3, name: "Lurking in Shadows", text: "Gain Stealth proficiency; Hide as bonus action; add WIS modifier to Stealth checks in dim light or darkness." },
      { level: 7, name: "Dark Empowerment", text: "Shadow Bow range +40 ft. Once per turn on hit, apply one debuff: disadvantage on saves, -10 ft speed, blinded (Con save), or 1d8 necrotic damage at start of target's next turn." },
      { level: 11, name: "Shadow Strike", text: "Hitting while hidden deals +2d10 necrotic. Reaction after attacking: teleport within 30 ft to dim light or darkness." },
      { level: 15, name: "Master of Shadows", text: "Shadow Bow deals +1d12 necrotic. On hit, apply two debuffs from Dark Empowerment instead of one. Uses = Wisdom modifier (min 1), recharge long rest. Shadow Bow ignores resistance; treats immunity as resistance." }
    ], note: "" },
    { id: "venomous-hunter-conclave", name: "Venomous Hunter Conclave", parentClass: "Ranger", summary: "A ranger who coats arrows in poison, marks prey for death, and enchants ammunition with elemental magic.", features: [
      { level: 3, name: "Poisoned Arrows", text: "Bonus action: coat ammo in poison for 1 minute or until hit. Hit deals +1d6 poison damage (2d6 at 11th, 3d6 at 15th)." },
      { level: 3, name: "Marked for Death", text: "Bonus action: mark creature within 90 ft for 1 minute. Advantage on attacks, +1d4 damage against it. Uses = Wisdom modifier (min 1), recharge long rest." },
      { level: 7, name: "Enchanted Arrows", text: "After long rest, choose enchantment for a number of arrows = Wisdom modifier: Flaming +1d6 fire; Frost +1d6 cold, -10 ft speed; Thunder +1d6 thunder, Str save or pushed 10 ft. Lasts until next long rest." },
      { level: 11, name: "Deadly Precision", text: "Critical hit range with ranged attacks increases by 1 (e.g. 20 to 19-20). On crit, roll one additional weapon damage die." },
      { level: 15, name: "Master Poisoner", text: "Create special poison once per long rest: 6d6 poison + poisoned condition 1 minute (Con save DC 8+PB+WIS at end of each turn to end). Poisoned Arrows now ignores poison resistance." }
    ], note: "" },
    { id: "reaper-of-souls-archetype", name: "Reaper of Souls Archetype", parentClass: "Rogue", summary: "A rogue who harvests souls of slain enemies to gain temporary hit points and necrotic power.", features: [
      { level: 3, name: "Soul Reaper", text: "On kill with melee, harvest soul: gain temp HP = Rogue level + Dex modifier; proficiency with scythes (finesse)." },
      { level: 9, name: "Death's Embrace", text: "Reaction: expend harvested soul to reduce damage by 2x Rogue level. Uses = proficiency bonus per long rest." },
      { level: 13, name: "Phantom Strike", text: "Attacks with advantage deal extra necrotic = Rogue level. Killing blow restores one Death's Embrace use." },
      { level: 17, name: "Grim Harvest", text: "On melee kill, reap soul and take an extra turn with advantage on attacks and no opportunity attacks provoked. Once per long rest." }
    ], note: "" },
    { id: "surgeon-of-shadows-archetype", name: "Surgeon of Shadows Archetype", parentClass: "Rogue", summary: "A rogue who masters anatomical precision to debilitate, paralyze, and defeat foes with targeted strikes.", features: [
      { level: 3, name: "Precise Striker", text: "On Sneak Attack, apply one effect: Hamstring Strike (halve speed), Disarming Blow (Str save DC 8+DEX+PB or drop item), or Weakening Wound (disadvantage on next Str attack/check). Uses = Dex modifier, recharge short or long rest." },
      { level: 9, name: "Anatomical Insight", text: "Gain Medicine proficiency and expertise. On critical hit, choose to stun target until end of your next turn. Also: know creature's anatomical weaknesses (if any); once per turn, deal +1d4 x INT modifier additional damage. Uses = half rogue level." },
      { level: 13, name: "Paralyzing Precision", text: "When dealing Sneak Attack damage, choose to make target paralyzed until end of your next turn: Con save DC 8+DEX+PB; success = stunned until start of your next turn instead. Once per long rest." },
      { level: 17, name: "Master of Nerve Strikes", text: "Apply two effects from Precise Striker on one Sneak Attack. Paralyzing Precision can affect a second target within 5 ft. Six times per long rest: on Sneak Attack hit, target incapacitated 1 minute (Con save at end of each turn to end)." }
    ], note: "" },
    { id: "shinobis-blade-archetype", name: "Shinobi's Blade Archetype", parentClass: "Rogue", summary: "A rogue archetype wielding a soul-bound magical blade with lightning and arcane abilities inspired by legendary shinobi warriors.", features: [
      { level: 3, name: "Shinobi's Blade", text: "Gain a magical finesse blade (katana, kunai, or similar) dealing 1d6 slashing; counts as magical. Bolted Strike: once per round on hit, deal +1d6 lightning (2d6 at 9th, 3d6 at 17th)." },
      { level: 3, name: "Shinobi's Grace", text: "Uncanny Reflexes: reaction to attacker making roll vs you — move half speed and impose disadvantage; if attack misses, move full speed (even if already moved)." },
      { level: 9, name: "Shadow Step", text: "Bonus action: teleport up to 30 ft to visible space; attacks against you have disadvantage until start of your next turn. Uses = Dex modifier (min 1), recharge long rest." },
      { level: 9, name: "Extra Attack", text: "You can attack twice instead of once when taking the Attack action." },
      { level: 13, name: "Raiton Surge", text: "Tento Burst: action, charge blade; next hit before end of next turn deals +4d6 lightning + Con save DC 8+DEX+PB or paralyzed until start of your next turn. Lightning Dash: when using Shadow Step, appear in burst of lightning dealing 1d8 to creatures within 5 ft. Recharge on short or long rest." },
      { level: 17, name: "Perfected Shinobi's Grace", text: "Ethereal Dodge: full dodge mechanics cut off in source document. NEEDS MANUAL REVIEW." }
    ], note: "Level 17 Ethereal Dodge feature text is cut off in the source document and requires manual completion." },
    { id: "vanir-archetype", name: "Vanir Archetype", parentClass: "Rogue", summary: "Vanir rogues combine stealth, trickery, and magic using Mischief Dice and teleportation to strike unpredictably.", features: [
      { level: 3, name: "Mischief Dice", text: "Pool of d6s equal to proficiency bonus + Dex modifier; expend one on hit for random effect (d6 table: 1=disadvantage on next attack, 2=3d6 psychic, 3=Str save or prone, 4=rune giving next attacker advantage, 5=3d6 fire to target and 5-ft radius, 6=temp HP = roll+Cha); recharge on long rest." },
      { level: 3, name: "Two-Weapon Fighting Mastery", text: "Add Dex modifier to damage rolls of both attacks; handaxes and daggers are preferred weapons." },
      { level: 6, name: "Blink Strike", text: "Bonus action: throw a weapon at creature within 30 ft; on hit, teleport to weapon's location and make one additional melee attack with advantage; on hit, +1d6 force damage. Uses = proficiency bonus per long rest." },
      { level: 9, name: "Enhanced Mischief Dice", text: "Mischief Die effects amplified: damage effects deal +1d6; non-damage effects strengthened (e.g. roll 1: confused 1 minute; roll 4: rune imposes disadvantage on all saves until your next turn; roll 6: temp HP also grant damage resistance)." },
      { level: 13, name: "Shadowstep Ambush", text: "Action: teleport to visible location within 60 ft; make melee attack against creature within 5 ft — +3d6 force damage with advantage. Also: reaction to teleport 30 ft when creature within 5 ft misses you, then attack if in reach. Uses = proficiency bonus per long rest." },
      { level: 17, name: "Mischief Incarnate", text: "Mischief Dice become d8s; roll two and choose. Damage effects deal +1d8; non-damage effects impose disadvantage on saves to resist. Vanir's Wrath: once per long rest, action — teleport to up to 6 creatures within 30 ft in succession, making melee attack vs each for +3d10 force, then teleport back to start." }
    ], note: "" },
    { id: "death-knights-curse", name: "Death Knight's Curse", parentClass: "Sorcerer", summary: "Sorcerers marked by a death knight's curse who wield shadow blades, necrotic magic, and vampiric resilience.", features: [
      { level: 1, name: "Shadow Blade", text: "Bonus action: summon shadow blade (simple finesse light thrown 30/60, 2d4 psychic, proficient). Lasts 1 minute or until dismissed." },
      { level: 1, name: "Dark Magic", text: "Bonus spells: 1st Inflict Wounds, False Life; 3rd Blindness/Deafness, Shadow Blade; 5th Animate Dead, Bestow Curse; 7th Phantasmal Killer, Blight; 9th Cloudkill, Contagion." },
      { level: 6, name: "Cursed Resilience", text: "Resistance to necrotic damage. Reaction when taking damage: gain temp HP = half damage taken until start of next turn. Uses = CHA modifier (min 1) per long rest." },
      { level: 14, name: "Empowered Shadow Blade", text: "Shadow Blade damage increases to 4d4. On hit, expend spell slot for +2d8 necrotic per slot level (max 8d8 at 4th+)." },
      { level: 18, name: "Death Knight's Embrace", text: "Immunity to necrotic; Shadow Blade damage becomes 6d4. On reducing creature to 0 HP with Shadow Blade, regain HP equal to psychic damage dealt." }
    ], note: "" },
    { id: "divine-wrath", name: "Divine Wrath", parentClass: "Sorcerer", antiDivine: true, summary: "Sorcerers marked by divine judgment wield radiant or necrotic fury to defy and overthrow celestial powers.", features: [
      { level: 1, name: "Divine Defiance", text: "Resistance to radiant and necrotic damage; reaction to add Charisma modifier to saves vs charm/frighten; advantage if source is celestial or deity-granted." },
      { level: 1, name: "Wrathful Smite", text: "Spend 1 sorcery point to add Charisma modifier as radiant or necrotic damage to spells hitting celestials; ignores resistance/immunity." },
      { level: 6, name: "Divine Spell Rebellion", text: "Reaction + 2 sorcery points to disrupt cleric/paladin spell within 30 ft; caster makes Charisma save or spell fizzles, granting you temp HP = twice spell's level." },
      { level: 14, name: "Unholy Aura", text: "Bonus action: 1-minute aura, 10 ft; allies gain radiant/necrotic resistance; celestials make Cha save DC 8+prof+CHA or have disadvantage on attacks. Uses = proficiency bonus per long rest." },
      { level: 18, name: "God-Slaying Wrath", text: "Action, 5 sorcery points: one celestial/divine caster within 60 ft makes Con save DC 8+prof+CHA; fail = 10d10 radiant or necrotic + stunned; success = half, no stun. Once per long rest." }
    ], note: "" },
    { id: "lichs-curse", name: "Lich's Curse", parentClass: "Sorcerer", summary: "Sorcerers of lich bloodline who wield necrotic affinity, undead fortitude, and a consuming aura of death.", features: [
      { level: 1, name: "Dark Heritage", text: "Necrotic Affinity: resistance to necrotic; add CHA modifier to necrotic spell damage. Undead Fortitude: HP max +1 per class level; advantage on saves vs disease/poisoned." },
      { level: 6, name: "Undead Connection", text: "Grave Touch: action, touch Con save DC 8+PB+CHA; fail = 4d10+CHA necrotic + paralyzed until end of your next turn; success = half, not paralyzed (3d10 at 10th). Uses = CHA modifier (min 1) per long rest. Eyes of the Undead: darkvision 60 ft (+30 ft if already have darkvision)." },
      { level: 14, name: "Lich's Aura", text: "Bonus action: 10-ft aura 1 minute; chosen creatures take necrotic = CHA modifier at start of their turn; you and allies in aura gain temp HP = CHA modifier at start of their turn. Once per long rest." },
      { level: 18, name: "Undying Soul", text: "When reduced to 0 HP but not killed outright, drop to 1 HP instead. Once per long rest. Necrotic Mastery: deal max damage on necrotic spells instead of rolling. Once per long rest." }
    ], note: "" },
    { id: "voidborne", name: "Voidborne", parentClass: "Sorcerer", summary: "Voidborn Sorcerers channel chaotic Void energy to manipulate reality, convert damage types, and trigger unpredictable Void Surges.", features: [
      { level: 1, name: "Void Infusion", text: "Gain eldritch blast cantrip (sorcerer cantrip, free slot); convert spell damage to force/psychic; gain resistance to force damage." },
      { level: 1, name: "Rift Step", text: "Bonus action: teleport up to 15 ft to visible space, no opportunity attacks. Uses = proficiency bonus per long rest." },
      { level: 1, name: "Void Surges", text: "When casting 1st+ level spell, roll d4; on 3-4, roll d20 for one of 20 Void Surge effects (1=1d6 temp HP, 2=advantage on next roll, 3=spell deals +1d8 psychic, 4=teleport 10 ft, 5=invisible until end of next turn, 6=enemy speed halved, 7=target can't teleport 1 min, 8=fear aura 10 ft, 9=+1d10 force on next attack, 10=5-ft radius 1d6 force, 11-20 and more dynamic effects)." },
      { level: 1, name: "Rift Magic", text: "Bonus spells always prepared: 1st Dissonant Whispers, Arms of Hadar; 3rd Mirror Image, Misty Step; 5th Counterspell, Hunger of Hadar; 7th Dimension Door, Phantasmal Killer; 9th Wall of Force, Synaptic Static." },
      { level: 6, name: "Void's Grasp", text: "When you hit with spell attack or force a save, tether target until start of your next turn: speed halved, teleport/plane shift requires Cha save vs spell DC or fails. Uses = proficiency bonus per long rest." },
      { level: 6, name: "Unseen Spell", text: "Action: cast spell through Void. Spell attacks have advantage (+1d10 force damage); saving throw spells imposed with disadvantage. Uses = proficiency bonus per long rest." },
      { level: 14, name: "Eclipse of the Rift", text: "Reaction when hit or fail a save: vanish into Void and reappear within 60 ft; until start of your next turn, resistance to all damage except psychic. Uses = proficiency bonus per long rest." },
      { level: 18, name: "Devour Reality", text: "Action, concentration 1 minute: choose point within 120 ft; 20-ft radius sphere of Void energy. Creatures of your choice must make Con save or take 10d10 force (half on success); area heavily obscured; non-you spellcasting requires check vs spell save DC. Once per long rest." },
      { level: 18, name: "Greater Void Surges", text: "Void Surges now trigger on d4 roll of 2-4 (was 3-4), and use a d100 (100 effects) instead of d20, with more powerful and dynamic effects." }
    ], note: "" },
    { id: "void-vigilance", name: "Void Vigilance", parentClass: "TeliKin", activeRework: true, summary: "Seers of the Void who gain supernatural foresight, immunity to surprise, and precognitive combat abilities.", features: [
      { level: 3, name: "Void Sight", text: "See through walls, darkness, invisibility within 60 ft; immune to flanking/surprise. Range increases to 120 ft at 10th, 300 ft at 18th." },
      { level: 6, name: "Precognition", text: "Gain advantage on one attack/save/check or impose disadvantage on one attack targeting you. Uses = Intelligence modifier (min 1), recharge long rest." },
      { level: 10, name: "Foresight Strike", text: "When attacking, make one extra weapon attack with advantage; on hit, deals additional 3d8 psychic damage." },
      { level: 14, name: "Glimpse the Tides", text: "Action: grant self or ally within 30 ft advantage on next 5 attack rolls/saves, or impose disadvantage on next 5 attacks targeting them. Uses = half TeliKin level (rounded up), recharge long rest." },
      { level: 18, name: "Void Perception", text: "Feature text cut off in source document. NEEDS MANUAL REVIEW." }
    ], note: "Level 18 Void Perception feature text is cut off in the source document and requires manual completion." },
    { id: "void-clasher", name: "Void Clasher", parentClass: "TeliKin", activeRework: true, summary: "A teleportation-focused subclass that strikes from multiple angles using Void portals, illusions, and rapid blinks.", features: [
      { level: 3, name: "Void Rush", text: "Teleport up to 10 feet before/after attacks; grants advantage if teleporting before. Uses = Intelligence modifier, recharge long rest." },
      { level: 6, name: "Phantom Assault", text: "Summon two spectral images within 10 feet for 1 minute; enemies have disadvantage on opportunity attacks and attacks if image within 5 feet. Once per long rest, twice at 14th level." },
      { level: 10, name: "Defensive Blink", text: "Reaction: impose disadvantage on an attack roll by teleporting; if it misses, teleport up to 15 feet and regain one Void Rush use." },
      { level: 14, name: "Cascade of Blades", text: "Make attacks equal to half Intelligence modifier (min 1) with advantage, dealing force damage; teleport 10 ft after each attack. Once per long rest." },
      { level: 18, name: "Shadow Slip", text: "Use Void Rush as bonus action without expending a use; Dodge as bonus action after Void Rush; missed melee attackers take force damage equal to Intelligence modifier." }
    ], note: "" },
    { id: "void-guardian", name: "Void Guardian", parentClass: "TeliKin", activeRework: true, summary: "Void Guardians use Void energy to protect allies, evade attacks, and create spectral barriers.", features: [
      { level: 3, name: "Defensive Reposition", text: "Reaction: teleport up to 30 ft to visible space when targeted by attack, no opportunity attacks. Uses = Intelligence modifier (min 1), recharge long rest." },
      { level: 6, name: "Void Armor", text: "Bonus action: +2 AC and resistance to nonmagical bludgeoning/piercing/slashing for 1 minute. On ranged miss while active, roll d20; on 16+, redirect attack to a creature within 30 ft using original roll. At 14th: extend to two willing allies within 10 ft. Once per short or long rest (twice from 18th)." },
      { level: 10, name: "Shield Wall", text: "Action: spectral wall up to 30 ft long, 10 ft high, 5 ft thick centered on a point within 60 ft — provides three-quarters cover for 1 minute. Creatures passing through make Str save vs spell DC or speed reduced to 0 for the rest of their turn. Once per long rest (twice from 18th)." },
      { level: 14, name: "Guardian's Resolve", text: "Reaction when you or ally within 10 ft takes damage: reduce it by Intelligence modifier + half TeliKin level (rounded up). Uses = proficiency bonus per long rest." },
      { level: 18, name: "Bastion of Shields", text: "Action: 15-ft radius sphere centered on you, moves with you, lasts 1 minute. You and allies inside gain resistance to all damage except psychic, advantage on saves vs multi-target effects. Allies can use reaction to create Void Shield (full cover vs cone/line/area). Once per long rest." }
    ], note: "" },
    { id: "void-striker", name: "Void Striker", parentClass: "TeliKin", activeRework: true, summary: "TeliKin who harness the Void offensively, wielding ethereal weapon arsenals through spatial portals.", features: [
      { level: 3, name: "Void Strike", text: "Once per turn: summon spectral weapon copy from pocket dimension, make attack vs creature within 30 ft using INT modifier for attack and damage. Uses = INT modifier (min 1) per long rest." },
      { level: 6, name: "Ethereal Armament", text: "Bonus action: summon ethereal weapon (magical, INT for attack/damage, lasts 1 minute). At 10th: enlarge to massive floating weapon, action to attack creature within 30 ft for 2d12 force." },
      { level: 10, name: "Voidstorm", text: "Action: summon up to 3 spectral weapons around you for 1 minute; any creature starting turn within 10 ft or moving into range takes 1d8+INT force. Once per long rest (twice from 14th)." },
      { level: 14, name: "Void Infusion", text: "On hit with summoned/ethereal weapon, deal +3d8 force. First use per turn costs no action; additional uses cost reaction. Uses = proficiency bonus per long rest." },
      { level: 18, name: "Arsenal of the Void", text: "Action: summon all pocket dimension weapons 1 minute; 2d6 force to creatures within 15 ft or entering. Action: target up to 3 creatures within 30 ft, Dex save vs spell DC: fail = 6d8 force, half on success. Once per long rest." }
    ], note: "" },
    { id: "pact-of-the-god-slayer", name: "Pact of the God Slayer", parentClass: "Warlock", antiDivine: true, summary: "A warlock who forged a pact with an ancient god-slaying force, gaining power to resist and destroy divine beings.", features: [
      { level: 1, name: "Expanded Spell List", text: "Level 1: Divine Favor, Protection from Evil and Good. Level 2: Magic Weapon, Zone of Truth. Level 3: Dispel Magic, Crusader's Mantle. Level 4: Freedom of Movement, Guardian of Faith. Level 5: Dispel Evil and Good, Holy Weapon." },
      { level: 1, name: "Divine Defiance", text: "Resistance to radiant damage. Reaction when creature within 30 ft deals radiant/necrotic to you: force Wisdom save DC 8+CHA+PB; fail = take damage = half warlock level (rounded up) + CHA modifier (radiant or necrotic, your choice)." },
      { level: 1, name: "Physical Defiance", text: "Proficiency in simple and martial weapons; use Charisma instead of Strength or Dexterity for damage." },
      { level: 6, name: "God Slayer's Strike", text: "Once per turn on hit, deal +2d8 radiant/necrotic; celestials make Con save or can't regain HP until your next turn. Uses = proficiency bonus per long rest." },
      { level: 10, name: "Shield of Defiance", text: "Immunity to charm/fright from celestials. Reaction when creature within 30 ft uses legendary action or resistance: expend spell slot; creature makes Wisdom save vs spell save DC or action/resistance negated and it takes radiant/necrotic = warlock level." },
      { level: 14, name: "Divine Banishment", text: "Action: target celestial or divine creature within 60 ft makes Charisma save vs spell DC; fail = banished to a realm beyond the divine for 1 minute (no legendary actions/resistances while banished); success = 6d10 radiant or necrotic + stunned until end of your next turn. Once per long rest." }
    ], note: "" },
    { id: "pact-of-the-evalune", name: "Pact of the Evalune", parentClass: "Warlock", narrativeLocked: true, summary: "Warlocks pacted with the Evalune who gain all-consuming sight, drain power from fallen casters, and radiate devouring magical force.", features: [
      { level: 1, name: "Expanded Spell List", text: "1st: Detect Magic, Inflict Wounds; 2nd: Mirror Image, See Invisibility; 3rd: Counterspell, Spirit Guardians; 4th: Phantasmal Killer, Dimension Door; 5th: Dispel Evil and Good, Contagion." },
      { level: 1, name: "Devourer's Sight", text: "Eyes turn deep purple; darkvision 120 ft; see through magical darkness; perceive magical auras. At 6th: Truesight 30 ft. At 14th: Truesight 60 ft, see through illusions and shapechanged true forms." },
      { level: 6, name: "Essence Eater", text: "On reducing spellcaster or divine creature to 0 HP, regain spell slot up to 5th level. Uses = proficiency bonus per long rest." },
      { level: 10, name: "Ethereal Shift", text: "Reaction when taking damage or targeted by spell: become ethereal until start of next turn (immune nonmagical attacks, can move through solid objects). Twice per long rest." },
      { level: 14, name: "Aura of Unyielding Magic", text: "20-ft aura: allies gain resistance to radiant/necrotic; enemies starting turn in aura Wis save vs spell DC: fail = 2d10 force + regain HP = half damage. Divine Consumption: action, creature within 60 ft with innate/divine spellcasting, Con save vs spell DC; fail = stunned until end of your next turn + gain temp HP = creature's spellcasting modifier x warlock level. Once per long rest." }
    ], note: "" },
    { id: "pact-of-vampirism", name: "Pact of Vampirism", parentClass: "Warlock", summary: "Warlocks who channel vampiric power to drain life, control blood, and assume a terrifying vampiric form.", features: [
      { level: 1, name: "Expanded Spell List", text: "1st: False Life, Inflict Wounds; 2nd: Bloodletting Strike, Hold Person; 3rd: Vampiric Touch, Animate Dead; 4th: Greater Invisibility, Shadow of Moil; 5th: Dominate Person, Cloudkill." },
      { level: 1, name: "Dark Gift", text: "Life Drain: on melee or warlock spell hit, bonus action to regain HP = half damage dealt. Uses = CHA modifier (min 1) per long rest. Bloodborn Reflexes: +10 ft speed; proficiency in Acrobatics or Athletics. Battle Prowess: proficiency in martial weapons; use CHA for attack and damage; proficiency in medium armor." },
      { level: 6, name: "Vampiric Resilience", text: "Resistance to necrotic and psychic damage; HP max cannot be reduced. Crimson Shield: reaction when creature within 30 ft takes damage, roll 1d10+warlock level to reduce damage; gain temp HP = amount reduced. Uses = CHA modifier per long rest." },
      { level: 10, name: "Blood Dominion", text: "Hemorrhage Control: action, creature within 30 ft Con save vs spell DC; fail = 4d10 necrotic + you control movement 1 round; success = half. Chilling Allure: action, 30-ft Wis save or charmed 1 min (incapacitated, speed 0; repeat save each turn). Once per long rest." },
      { level: 14, name: "Vampiric Ascension", text: "Action, 1 minute: claws (1d10+CHA slashing, magical), speed doubled, Dash as bonus action, OA disadvantage. Life Leech: on melee/claw hit, Con save vs spell DC; fail = +4d8 necrotic + regain HP = half. Dread Presence: hostile within 30 ft have disadvantage vs frightened. Once per long rest." }
    ], note: "" },
    { id: "pact-of-dragon-goddess", name: "Pact of the Dragon Goddess", parentClass: "Warlock", summary: "Warlocks pacted with Tiamat who wield Draconic Dice to shift elemental damage types, forge scales, and exhale multi-element breath.", features: [
      { level: 1, name: "Expanded Spell List", text: "1st: Chromatic Orb, Absorb Elements; 2nd: Dragon's Breath, Alter Self; 3rd: Elemental Weapon, Fear; 4th: Elemental Bane, Fire Shield; 5th: Cone of Cold, Flame Strike." },
      { level: 1, name: "Draconic Blessing", text: "Draconic Scales: AC 13+DEX (or +1 if armored/shielded); resistance to one chosen Tiamat element (change on long rest). Draconic Dice: d6 pool equal to warlock level, recharge short or long rest (d8 at 10th, d10 at 14th)." },
      { level: 6, name: "Chromatic Techniques", text: "Elemental Infusion: on casting damage spell, expend Draconic Dice to convert damage type to Tiamat element + add dice total to damage. Draconic Claw Attack: action, melee spell attack, CHA modifier + Draconic Dice total, chosen Tiamat element. Elemental Scales: bonus action, expend dice, AC increases by highest single die result for CHA modifier rounds; gain resistance per die spent (immunity if same element chosen twice)." },
      { level: 10, name: "Elemental Mastery", text: "Draconic Dice become d8s. Elemental Breath: action, expend dice, choose element and shape (30-ft cone or 60-ft line), Dex save vs spell DC: fail = CHA modifier + 2x Draconic Dice total; 3+ dice spent = disadvantage on next save. Multi-Element Resistance: choose two Tiamat elements for resistance on long rest (same = immunity)." },
      { level: 14, name: "Quintessence of Tiamat", text: "Draconic Dice become d10s. Overflowing Elemental Might: roll each die twice and choose result (not extra dice). Draconic Supremacy: Elemental Scales last 10 minutes; add more dice during duration freely. Ignore resistance to Tiamat element damage from subclass features; immunity creatures take half. Adaptive Resistance: start of each turn, shift one resistance/immunity to another element (if at least 1 die remaining)." }
    ], note: "" },
    { id: "ice-blade", name: "Ice Blade", parentClass: "Gensarch", element: "Water", summary: "A subclass focused on creating frozen weapons to restrain and damage enemies with cold.", features: [
      { level: 3, name: "Frozen Weaponry", text: "Bonus action: create ice weapon dealing cold damage; hits reduce target speed by 10 ft until end of their next turn." },
      { level: 7, name: "Frost Bind", text: "Once per turn on hit, Strength save or restrained until end of next turn; DC = 8 + Prof + Str/Wis." },
      { level: 11, name: "Shatter Lance", text: "Action: 30 ft line, 5 ft wide; Dex save or 5d8 cold damage, speed halved 1 minute (repeat save ends effect)." },
      { level: 15, name: "Glacial Guard", text: "Resistance to cold damage; reaction to reduce incoming damage from any source by Elemental Damage Die." }
    ], note: "" },
    { id: "radiant-wave", name: "Radiant Wave", parentClass: "Gensarch", element: "Water", summary: "A support-focused subclass that uses Genn Dice to heal allies and restore HP to multiple creatures.", features: [
      { level: 3, name: "Healing Flow", text: "Use a Genn Die to heal a creature within 30 ft: HP = die roll + Wisdom modifier." },
      { level: 7, name: "Rejuvenating Tide", text: "Bonus action: spend a Genn Die to heal up to 3 creatures within 15 ft; HP = half die + Wisdom modifier. Uses = proficiency bonus per long rest." },
      { level: 11, name: "Purifying Current", text: "Allies you heal also gain until end of their next turn: advantage on their next saving throw and 1d6 temporary hit points." },
      { level: 15, name: "Overflow", text: "Once per long rest, when healing with a Genn Die, duplicate the effect to a second creature within 30 ft at no cost. On a critical heal (max die roll), the target gains resistance to all damage for 1 round." }
    ], note: "" },
    { id: "water-cannon", name: "Water Cannon", parentClass: "Gensarch", element: "Water", summary: "A ranged subclass that fires powerful water blasts, splitting damage and unleashing sweeping tidal arcs.", features: [
      { level: 3, name: "Pressure Burst", text: "Ranged water attack (90 ft): 1d12+WIS bludgeoning or cold. Str save or pushed 10 ft. Counts as an attack (usable twice with Extra Attack)." },
      { level: 7, name: "Hydro Scatter", text: "On Water Cannon hit, choose one creature within 10 ft of target — it takes half the original damage." },
      { level: 11, name: "Tidal Arc", text: "Once per short rest: 60-ft cone, Dex save: 8d8 cold or bludgeoning + knocked prone on fail." },
      { level: 15, name: "Aqua Barrage", text: "Make 3 Water Cannon attacks per action. All 3 hitting same target deal bonus Elemental Damage Die damage and target is stunned until start of your next turn (Con save to resist)." }
    ], note: "" },
    { id: "wave-step", name: "Wave Step", parentClass: "Gensarch", element: "Water", summary: "A water-style subclass that controls the battlefield through fluid movement, redirection, and vortex attacks.", features: [
      { level: 3, name: "Flow Movement", text: "Dash/Disengage leaves water trail; enemies entering trail make Dex save or fall prone; ignore difficult terrain." },
      { level: 7, name: "Crushing Flow", text: "Genn Die damage lets you push 15 ft or pull 10 ft; collision deals 1d8 extra damage." },
      { level: 11, name: "Whirlpool Spin", text: "Once per turn when missed by melee: attacker makes Str save or pulled 10 ft and knocked prone; move 10 ft freely." },
      { level: 15, name: "Tidal Collapse", text: "Once per long rest: 20 ft radius, 40 ft cylinder; Str save or pulled to center, prone, 6d10 bludgeoning; difficult terrain 1 minute." }
    ], note: "" },
    { id: "school-of-bladebinding", name: "School of Bladebinding", parentClass: "Wizard", activeRework: true, summary: "Wizards who store spells within a bound blade and release them through melee strikes.", features: [
      { level: 2, name: "Bladebound Magic", text: "Proficiency with martial weapons and all armor. Chosen melee weapon becomes spellbook and focus; spells engrave magically. INT and STR or DEX (your choice) are main attributes. Transferring to new weapon takes 1 hour." },
      { level: 2, name: "Spellstrike", text: "Spend spell slots at day start to pre-cast and store spells in blade. Store limit: 3 spell levels at 2nd. On melee hit, release one stored spell as part of the attack. Stored spells need no components; don't harm caster." },
      { level: 6, name: "Arcane Armor", text: "Reaction while wearing medium armor: add INT modifier to AC for one attack. Storage increases to 6 spell levels." },
      { level: 10, name: "Spellbound Rush", text: "After casting spell from blade, move up to 10 ft without provoking OA. Storage increases to 10 spell levels." },
      { level: 14, name: "Runic Overcharge", text: "When casting from blade, deal +INT modifier force damage to target(s). Storage increases to 12 spell levels. Once per long rest: release two stored spells simultaneously in one melee attack." }
    ], note: "" },
    { id: "school-of-desecration", name: "School of Desecration", parentClass: "Wizard", antiDivine: true, summary: "Wizards who unravel divine magic, disrupt celestial power, and seek to purge the Weave of godly influence.", features: [
      { level: 2, name: "Desecrator's Insight", text: "Gain Religion proficiency and expertise; detect celestials/fiends/undead and divine spells within 60 ft. Uses = proficiency bonus per long rest." },
      { level: 2, name: "Anti-Divine Ward", text: "Cast Protection from Evil and Good without spell slot, self only, no concentration, 10 min. Uses = Intelligence modifier (min 1) per long rest." },
      { level: 6, name: "Unravel Divinity", text: "Reaction: when creature makes divine spell/feature check, force Wisdom save vs your DC or it's negated; you take force damage = wizard level. Uses = proficiency bonus per long rest." },
      { level: 10, name: "Desecrate the Divine", text: "Action: 30-ft sphere desecrated 1 minute. Celestials/fiends/undead have disadvantage on saves; no divine healing in area; divine spells of 5th level or lower require Wisdom save or fail (caster takes psychic = 2x spell level). Once per long rest." },
      { level: 14, name: "Godslayer's Mastery", text: "Action: celestial or divine caster within 60 ft makes Con save or loses all spellcasting and divine features for 1 minute. You gain temp HP = wizard level + INT modifier and advantage on attacks/saves against that target. Once per long rest." }
    ], note: "" },
    { id: "school-of-infernal-summoning", name: "School of Infernal Summoning", parentClass: "Wizard", summary: "Wizards who summon and empower fiends, wielding hellfire and commanding an infernal legion.", features: [
      { level: 2, name: "Fiendish Familiarity", text: "Learn Find Familiar (free); can summon imp. Advantage on CHA checks with fiends." },
      { level: 2, name: "Infernal Flames", text: "Red floating flames surround you (bright 10 ft, dim 10 ft). Bonus action to intensify: creatures starting turn within 5 ft take fire damage = INT modifier per flame (number of flames = wizard level)." },
      { level: 6, name: "Dark Pact", text: "When summoning/creating a fiend, empower it: temp HP = 2x wizard level, +2x INT modifier fire damage on attacks. Once per long rest." },
      { level: 10, name: "Hellfire Mastery", text: "Fire damage spells can deal necrotic instead. Ignore resistance to fire/necrotic damage. Shoot infernal flames as ranged spell attacks at creatures within 120 ft (visible to you or your summoned creatures), each dealing 5 fire damage." },
      { level: 14, name: "Infernal Legion", text: "Cast Summon Greater Demon without spell slot. Summon up to 3 fiends with combined CR ≤ wizard level; remain under control 1 hour then vanish. Once per long rest." }
    ], note: "" },
    { id: "school-of-prismatics", name: "School of Prismatics", parentClass: "Wizard", summary: "A wizard subclass that harnesses prismatic magic to deal multi-colored damage and create protective barriers.", features: [
      { level: 2, name: "Prismatic Savant", text: "Copying evocation or abjuration spells costs one-quarter normal. Learn Chromatic Orb (doesn't count against prepared spells)." },
      { level: 2, name: "Enhanced Prismatic Prism", text: "Bonus action: create a magical prism within 60 ft that lasts 1 minute; up to three prisms active at once. Full usage options cut off in source document." },
      { level: 14, name: "Enhanced Prismatic Beam", text: "Prismatic Beam deals +3d8 damage of any two chosen types (acid, cold, fire, lightning, poison, or radiant)." },
      { level: 14, name: "Prismatic Barrier Immunity", text: "Prismatic Radiance can grant immunity to two chosen damage types instead of resistance." },
      { level: 14, name: "Living Prism", text: "Once per day, transform into Living Prism for 1 minute: use Prismatic Beam as bonus action, gain resistance to all damage." }
    ], note: "Enhanced Prismatic Prism usage options are cut off in the source document. NEEDS MANUAL REVIEW." },
    { id: "school-of-vacuus", name: "School of Vacuus", parentClass: "Wizard", summary: "Wizards who master Void energy to manipulate, disrupt, and control enemies using reality-warping forces.", features: [
      { level: 2, name: "Void Knowledge", text: "Change damage type of spells to force or psychic. Void Lashes cantrip (class cantrip): 1d12 force/psychic (Dex save, half on success), scaling to 4d12 at 17th level, splittable across targets." }
    ], note: "Disruptive Presence benefit of Void Knowledge is cut off in the source document. NEEDS MANUAL REVIEW." },
    { id: "godslayer-archetype", name: "Godslayer Archetype", parentClass: "Rogue", antiDivine: true, summary: "Rogues who specialize in hunting and destroying divine beings, bypassing celestial resistances and empowering strikes with radiant or necrotic energy.", features: [
      { level: 3, name: "Divine Nemesis", text: "Sneak Attack deals +1d6 radiant/necrotic (2d6 at 9th, 3d6 at 13th, 4d6 at 17th); attacks bypass non-magical resistance." },
      { level: 3, name: "Divine Scent", text: "Gain Religion proficiency; add Intelligence modifier x2 to checks about celestial or divine entities." },
      { level: 9, name: "Divine Defiance", text: "Resistance to radiant and necrotic. Reaction when creature within 30 ft deals radiant/necrotic to you: force Wisdom save; fail = take radiant or necrotic = half rogue level + Dex modifier." },
      { level: 13, name: "Bane of the Divine", text: "When dealing Sneak Attack damage, apply Divine Bane: prevents target from using legendary actions or legendary resistances until start of your next turn. 3 times per short or long rest." },
      { level: 17, name: "Slayer's Ascension", text: "On Sneak Attack hit, deal +6d10 radiant or necrotic; target Con save or stunned until end of your next turn. Mark of the Divine Slayer: bonus action, mark creature within 60 ft for 1 minute — advantage on attacks, Sneak Attack ignores immunity. Once per long rest each." }
    ], note: "Listed in source doc as 'Archetype of the God Slayer.'" },
    { id: "eidolon-invoker", name: "Invoker", parentClass: "Eidolon", summary: "", features: [], note: "" },
    { id: "eidolon-warrior", name: "Warrior", parentClass: "Eidolon", summary: "", features: [], note: "" },
  ],
  // Define the canonical ordering of campaigns for the sidebar grouping
  campaignOrder: [
    "The Executioners",
    "The Wolfpack",
    "The New Dawn",
    "Shadows of Dusk",
    "One-Shots",
    "NPCs",
  ],
  // Campaign metadata — display status pills, descriptions, etc.
  campaigns: {
    "The Executioners": { description: "Level 9. Formerly 'The Jury.' Externally dysfunctional — damage radiates outward. Survivors are cautious, slow to trust, conditioned by loss." },
    "The Wolfpack": { status: "deceased", description: "Party wiped in a Djinn wish gone wrong. Glass and Benimaru's souls were later claimed and conscripted by Hades." },
    "The New Dawn": { description: "Active. NEXUS's party. Survivors of the Abyss, climbers of Mount Tempest." },
    "Shadows of Dusk": { description: "Active. Glass of Night's campaign, following his return from the Abyss." },
    "One-Shots": { description: "Side adventures within Chronicles of the Realms." },
    "NPCs": { description: "Notable named characters across the campaigns — connected figures, factions, and the major BBEGs of Chronicles of the Realms." },
  },
  characters: [
    // ============ THE EXECUTIONERS ============
    // Players
    { id: "percival", name: "Percival Leatherhardt", campaign: "The Executioners", role: "player", race: "Stonehide Crocothian", class: "Barbarian 9 (War Ravager / Path of the Tarasque)", patron: "—", summary: "Percival is not a complicated man. He is a deep one. Former thief, fish farmer from Nar'Zenkin coast, now an unbreakable tank built on stacking damage resistance, attack volume, and a custom AC formula. Grieving Heliabel. Operational.", keyTraits: ["9'1\", 500+ lbs — largest recorded Stonehide Crocothian", "Custom DM-ruled AC formula: 14 + DEX + CON, can use heavy armor while raging", "Buried his partner Heliabel in the Reaper's Tomb", "Chaotic Good, trending Neutral Good"], note: "" },
    { id: "captain-cuntch", name: "Captain Cuntch", campaign: "The Executioners", role: "player", race: "", class: "", patron: "", summary: "", keyTraits: [], note: "" },
    { id: "helion", name: "Helion", campaign: "The Executioners", role: "player", race: "", class: "", patron: "", summary: "", keyTraits: [], note: "" },
    { id: "enid", name: "Enid", campaign: "The Executioners", role: "player", race: "", class: "", patron: "", summary: "", keyTraits: [], note: "" },
    { id: "braylen", name: "Braylen", campaign: "The Executioners", role: "player", race: "", class: "", patron: "", summary: "", keyTraits: [], note: "" },
    { id: "magic-man", name: "Magic Man", campaign: "The Executioners", role: "player", race: "", class: "", patron: "", summary: "", keyTraits: [], note: "Brother of Mystic Man (Executioners NPC)." },
    // Deceased Players
    { id: "mew", name: "Mew", campaign: "The Executioners", role: "player", status: "deceased", race: "", class: "", patron: "", summary: "", keyTraits: [], note: "" },
    { id: "kronk", name: "Kronk", campaign: "The Executioners", role: "player", status: "deceased", race: "", class: "", patron: "", summary: "", keyTraits: [], note: "" },
    { id: "pj-old-character", name: "PJ's Old Character", campaign: "The Executioners", role: "player", status: "deceased", placeholder: true, race: "", class: "", patron: "", summary: "", keyTraits: [], note: "Placeholder. Name and details to be filled in." },
    // Connected
    { id: "heliabel", name: "Heliabel", campaign: "The Executioners", role: "connected", status: "deceased", race: "Brown-scaled Crocothian", class: "", patron: "—", summary: "Percival's partner, companion, the year of his life. Deceased. Buried in the Reaper's Tomb.", keyTraits: [], note: "" },
    // NPCs (faction-level relevant figures)
    { id: "mystic-man", name: "Mystic Man", campaign: "The Executioners", role: "connected", race: "", class: "", patron: "", summary: "", keyTraits: [], note: "Brother of Magic Man (Executioners player)." },
    { id: "indellis", name: "Indellis", campaign: "The Executioners", role: "connected", race: "", class: "", patron: "", summary: "", keyTraits: [], note: "" },
    { id: "patchy", name: "Patchy", campaign: "The Executioners", role: "connected", race: "", class: "", patron: "", summary: "", keyTraits: [], note: "" },
    { id: "captain-appel-jack", name: "Captain Appel Jack", campaign: "The Executioners", role: "connected", race: "", class: "", patron: "", summary: "", keyTraits: [], note: "" },

    // ============ THE WOLFPACK (deceased) ============
    // Players (some later claimed by Hades, two still living)
    { id: "glass-pre-hades", name: "Glass of Dusk (pre-Hades)", campaign: "The Wolfpack", role: "player", race: "LyCara", class: "Ranger", patron: "—", summary: "Glass's original life as a Wolfpack adventurer, before the Djinn wish that wiped the party. His soul was later claimed by Hades and conscripted as the Seventh Knight.", keyTraits: ["Later became Hades' Seventh Knight", "Eventually freed by NEXUS, returned as Glass of Night in Shadows of Dusk"], note: "See also: Glass of Dusk (New Dawn) and Glass of Night (Shadows of Dusk)." },
    { id: "benimaru-pre-hades", name: "Benimaru (pre-Hades)", campaign: "The Wolfpack", role: "player", race: "", class: "", patron: "", summary: "A Wolfpack adventurer whose soul, like Glass's, was claimed by Hades after the party-wipe.", keyTraits: ["Soul claimed by Hades following the Wolfpack's destruction"], note: "" },
    { id: "dr-shrimp", name: "Dr. Shrimp Puerto Rico", campaign: "The Wolfpack", role: "player", status: "deceased", race: "", class: "", patron: "", summary: "", keyTraits: [], note: "" },
    { id: "lotus", name: "Lotus", campaign: "The Wolfpack", role: "player", status: "deceased", race: "", class: "", patron: "", summary: "", keyTraits: [], note: "" },
    { id: "longinus-meliodas", name: "Longinus Meliodas", campaign: "The Wolfpack", role: "player", race: "", class: "", patron: "", summary: "Survived the Wolfpack's end. Now an active connected character in Shadows of Dusk.", keyTraits: [], note: "" },
    { id: "nimbus-pebblestep", name: "Nimbus Pebblestep", campaign: "The Wolfpack", role: "player", race: "", class: "", patron: "", summary: "Survived the Wolfpack's end. Now an active connected character in Shadows of Dusk.", keyTraits: [], note: "" },
    { id: "nobles-character", name: "Noble's Character", campaign: "The Wolfpack", role: "player", placeholder: true, race: "", class: "", patron: "", summary: "", keyTraits: [], note: "Placeholder. Name and details to be filled in." },
    { id: "noahs-character", name: "Noah's Character", campaign: "The Wolfpack", role: "player", placeholder: true, race: "", class: "", patron: "", summary: "", keyTraits: [], note: "Placeholder. Name and details to be filled in." },

    // ============ THE NEW DAWN ============
    // Players (active)
    { id: "nexus", name: "NEXUS", campaign: "The New Dawn", role: "player", race: "Conduit of Life", class: "Paladin 5 / Esper 6 (Oath of Renewal)", patron: "Lathander", summary: "A redemption-bound Conduit of Life. Paladin of the dawn, blooming psion. NEXUS is the moral anchor of the party — extending the offer of redemption first, the sword second.", keyTraits: ["Sworn to Lathander, god of dawn and renewal", "Redeemed Glass of Dusk from Hades' control mid-campaign", "Multiclassed for the Paladin-Esper synergy: Lay on Hands extended via Sanakinesis", "N.E.X.U.S. — Neurological EXpansion of a Unique Soul", "Wields the Vertex of Hope"], note: "Full profile, stat block, narrative history, and goal framework in NEXUS character doc." },
    { id: "kira", name: "Kira", campaign: "The New Dawn", role: "player", race: "KaeRuan", class: "Paladin", patron: "", summary: "Young KaeRuan Paladin. Carries sorrow and hope in the same breath. Quiet.", keyTraits: ["NEXUS reads: SORROW, HOPE, BOREDOM"], note: "" },
    { id: "jin-tonic", name: "Jin Tonic", campaign: "The New Dawn", role: "player", race: "KaeRuan", class: "", patron: "", summary: "Shifty young KaeRuan. Was charmed alongside NEXUS at the mirror encounter.", keyTraits: ["NEXUS reads: FEAR, CAUTIOUS CURIOSITY"], note: "" },
    { id: "jabron", name: "Jabron Balakrishnam", campaign: "The New Dawn", role: "player", race: "Crivan", class: "", patron: "", summary: "Cloaked Crivan. Caused the Infinite Chaos incident. Ambition unchecked, occasional lunacy.", keyTraits: ["NEXUS reads: AMBITION, APATHY, occasional LUNACY", "Triggered the Infinite Chaos incident"], note: "" },
    { id: "tayschrenn", name: "Tayschrenn Vai'Falis", campaign: "The New Dawn", role: "player", race: "KaeRuan", class: "", patron: "", summary: "Younger KaeRuan. Remained behind during the Mind Dive.", keyTraits: ["NEXUS reads: CONTEMPT, BEWILDERMENT, APPREHENSION", "Did not join the Mind Dive"], note: "" },
    { id: "abel", name: "Abel", campaign: "The New Dawn", role: "player", race: "Crivan", class: "", patron: "", summary: "Crivan. Default-distrustful. Driven by duty in haste.", keyTraits: ["NEXUS reads: DUTY, HASTE, DISTRUST", "Possibly tied to a unique Warlock-adjacent class (see Infernal Summoner subclass)"], note: "" },
    { id: "rivero", name: "Señior Rivero McShootin'", campaign: "The New Dawn", role: "player", race: "Littorin (small blue)", class: "Ranger", patron: "", summary: "A family man torn from his world by an Infinite Chaos portal in 211 PL, washed up in the Abyss centuries later in 900 PL. Speaks with a southern drawl. Goal: taste every kind of creature. Treats the party like family. Cries easily, especially about loss. Carries a personal magic broom.", keyTraits: ["Born Averix 17th, 191 PL", "Discovered his family was gone in a Mount Tempest trial", "Sacrificed his love of cooking at the Trial of the Tree (later restored)", "Joined the New Dawn Averix 8th, 906 PL"], note: "" },
    { id: "thourmose", name: "Thourmose", campaign: "The New Dawn", role: "player", race: "Venira", class: "", patron: "", summary: "Shaky Venira. Killed and revived at the cost of Sune's godhood. Whispers to a skull.", keyTraits: ["NEXUS reads: FEAR, CONFUSION, PRIDE", "Sune lost her godhood to revive him"], note: "" },
    { id: "echo-thalin", name: "Echo / Thalin", campaign: "The New Dawn", role: "player", race: "Born from the mirror", class: "", patron: "", summary: "Born from the mirror encounter. NEXUS was the first to extend a hand — they exist as a person rather than as a threat the party destroyed because of that choice.", keyTraits: ["NEXUS reads: FEAR — specifically, NEXUS's own FEAR mirrored back", "Met by the New Dawn Drandathor 13th, 906 PL"], note: "" },
    // Deceased Players
    { id: "cendis", name: "Cendis", campaign: "The New Dawn", role: "player", status: "deceased", race: "", class: "", patron: "", summary: "The first person who saw NEXUS clearly and accepted him without agenda. The formative wound of the early campaign. His question — 'are you your body or your mind or your soul?' — became the conceptual heart of NEXUS's character.", keyTraits: ["Founding member of the New Dawn", "Taught NEXUS patience, presence, and the difference between leading by command and leading by example"], note: "Also listed under NPCs as a notable figure." },
    { id: "kaeldoren", name: "Kael'Doren Tora'Kai", campaign: "The New Dawn", role: "player", status: "deceased", race: "KaeRuan (middle-aged)", class: "", patron: "", summary: "Founding member. Died to a Bone Devil on the first day in the Abyss. NEXUS read FEAR and SHAME but never had time to learn what they were about.", keyTraits: ["NEXUS reads: FEAR, SHAME", "Killed by Bone Devil, Abyss Day One"], note: "" },
    { id: "monke-tom", name: "Monk'E D. Tom", campaign: "The New Dawn", role: "player", status: "deceased", race: "Oro'Kong", class: "", patron: "", summary: "Founding member. Died to a Bone Devil on the first day in the Abyss before the uncertainty could resolve into something.", keyTraits: ["NEXUS reads: CONFUSION, UNCERTAINTY", "Killed by Bone Devil, Abyss Day One"], note: "" },
    // Connected
    { id: "glass-of-dusk-newdawn", name: "Glass of Dusk", campaign: "The New Dawn", role: "connected", race: "LyCara", class: "Ranger 11 (Shadowy Arrow)", patron: "—", summary: "Former Seventh Knight of Hades, redeemed by NEXUS at Mount Tempest. After the redemption, departed the New Dawn for his own arc as Glass of Night in Shadows of Dusk.", keyTraits: ["Redeemed mid-campaign", "Now operates in Shadows of Dusk as Glass of Night"], note: "Primary PC home: Shadows of Dusk." },
    { id: "cendis-connected-newdawn", name: "Cendis (notable)", campaign: "The New Dawn", role: "connected", status: "deceased", race: "", class: "", patron: "", summary: "Listed here for cross-reference. See Deceased Players entry above for full notes.", keyTraits: [], note: "Duplicate cross-reference entry — primary entry under Player Characters." },

    // ============ SHADOWS OF DUSK ============
    // Players
    { id: "glass-of-night", name: "Glass of Night", campaign: "Shadows of Dusk", role: "player", race: "LyCara", class: "Ranger (Shadowy Arrow)", patron: "Hirellios", summary: "The name Glass took at the summit of Mount Tempest, after answering a question no mountain had any right to ask. Three souls stood at the summit. One walked back down. The one who descended was not Glass of Dusk.", keyTraits: ["Formerly Glass of Dusk, the Seventh Knight of Hades", "Blessed by Hirellios at Mount Tempest", "Father of Glass of Dusk XV"], note: "" },
    { id: "glass-of-dusk-xv", name: "Glass of Dusk XV", campaign: "Shadows of Dusk", role: "player", race: "", class: "", patron: "", summary: "Fifteenth in the line. A Fang of the Ero'Bre — the cloak at his first meeting was a 'come join us once this job is done' recruitment gesture, and Glass knew it. Now a drunkard. The how of that is a question he has not answered.", keyTraits: ["Son of Glass of Night", "Fang of the Ero'Bre (recruited, status unclear)", "Currently a drunkard — circumstances unexplained"], note: "" },
    { id: "melldra", name: "Melldra'Narvir", campaign: "Shadows of Dusk", role: "player", race: "Malakar", class: "", patron: "", summary: "Asked the questions no one else asked. Pressed Glass XV on the Ero'Bre and Kendervick on the sister.", keyTraits: ["Interrogates rather than accepts"], note: "" },
    { id: "nolledae", name: "Nolledae Silafoness", campaign: "Shadows of Dusk", role: "player", race: "", class: "", patron: "", summary: "", keyTraits: [], note: "" },
    { id: "kendervick", name: "Kendervick Tundralord", campaign: "Shadows of Dusk", role: "player", race: "", class: "", patron: "", summary: "The man the story was written about. Allegedly killed his own sister, heralding the Ero'Bre as the rightful, Odin-chosen rulers of Silva Vekken. His painful denial to Melldra: a remark about how stupid the populace is.", keyTraits: ["Subject of the sister-killing story", "Tied to the Ero'Bre / Silva Vekken / Odin succession narrative"], note: "" },
    // Connected
    { id: "ylga", name: "Ylga", campaign: "Shadows of Dusk", role: "connected", race: "", class: "", patron: "", summary: "", keyTraits: [], note: "" },
    { id: "longinus-connected", name: "Longinus Meliodas (connected)", campaign: "Shadows of Dusk", role: "connected", race: "", class: "", patron: "", summary: "Wolfpack survivor. Connected to Glass through their shared history.", keyTraits: ["Former Wolfpack member, still living"], note: "Primary entry under The Wolfpack." },
    { id: "nimbus-connected", name: "Nimbus Pebblestep (connected)", campaign: "Shadows of Dusk", role: "connected", race: "", class: "", patron: "", summary: "Wolfpack survivor. Connected to Glass through their shared history.", keyTraits: ["Former Wolfpack member, still living"], note: "Primary entry under The Wolfpack." },

    // ============ ONE-SHOTS ============
    // (Chain Beneath Riva'Kyton characters held until after that adventure runs)

    // ============ NPCs (cross-campaign / lore figures) ============
    // BBEGs — major antagonistic factions
    { id: "hades", name: "Hades", campaign: "NPCs", role: "enemy", category: "BBEG", race: "Usurper-deity", class: "—", patron: "—", summary: "Usurper of the death domain. Wields the souls of dead adventurers as generals. Central antagonist of the Chronicles of the Realms.", keyTraits: ["Usurped the death domain from Morterra", "Claimed Glass of Dusk and Benimaru's souls from the Wolfpack's end", "Commands the Knights of Hades"], note: "" },
    { id: "arthel-galheel", name: "Arthel Galheel", campaign: "NPCs", role: "enemy", category: "BBEG", race: "", class: "Esper", patron: "—", summary: "NEXUS's creator. Designed the body to hold someone else's mind — Bion'Kallious. Did not intend the soul that emerged as a byproduct.", keyTraits: ["Designed the NEXUS vessel", "Servant / student of Bion'Kallious"], note: "" },
    { id: "bion-kallios", name: "Bion'Kallios", campaign: "NPCs", role: "enemy", category: "BBEG", race: "", class: "Esper of unfathomable power", patron: "—", summary: "Arthel's master. Trapped in the void by Lathren. Contacted NEXUS directly after the escape and threatened to take his body.", keyTraits: ["Trapped in the void by Lathren", "Direct threat to NEXUS's body and identity"], note: "" },
    { id: "evalune-of-rift", name: "The Evalune of Rift", campaign: "NPCs", role: "enemy", category: "BBEG", race: "Evalune", class: "—", patron: "—", summary: "", keyTraits: [], note: "" },
    { id: "evalune-of-divinity", name: "The Evalune of Divinity", campaign: "NPCs", role: "enemy", category: "BBEG", status: "deceased", race: "Evalune", class: "—", patron: "—", summary: "", keyTraits: [], note: "Deceased status to be confirmed." },
    // Seven Deadly Sins
    { id: "sin-pride", name: "Pride", campaign: "NPCs", role: "enemy", category: "Seven Deadly Sins", status: "freed", race: "Sin", class: "—", patron: "—", summary: "One of the Seven Deadly Sins. Freed.", keyTraits: [], note: "" },
    { id: "sin-greed", name: "Greed", campaign: "NPCs", role: "enemy", category: "Seven Deadly Sins", status: "freed", race: "Sin", class: "—", patron: "—", summary: "One of the Seven Deadly Sins. Freed.", keyTraits: [], note: "" },
    { id: "sin-lust", name: "Lust", campaign: "NPCs", role: "enemy", category: "Seven Deadly Sins", status: "freed", race: "Sin", class: "—", patron: "—", summary: "One of the Seven Deadly Sins. Freed.", keyTraits: [], note: "" },
    { id: "sin-gluttony", name: "Gluttony", campaign: "NPCs", role: "enemy", category: "Seven Deadly Sins", status: "freed", race: "Sin", class: "—", patron: "—", summary: "One of the Seven Deadly Sins. Freed.", keyTraits: [], note: "" },
    { id: "sin-envy", name: "Envy", campaign: "NPCs", role: "enemy", category: "Seven Deadly Sins", race: "Sin", class: "—", patron: "—", summary: "One of the Seven Deadly Sins. Status unknown.", keyTraits: [], note: "" },
    { id: "sin-wrath", name: "Wrath", campaign: "NPCs", role: "enemy", category: "Seven Deadly Sins", race: "Sin", class: "—", patron: "—", summary: "One of the Seven Deadly Sins. Status unknown.", keyTraits: [], note: "" },
    { id: "sin-sloth", name: "Sloth", campaign: "NPCs", role: "enemy", category: "Seven Deadly Sins", race: "Sin", class: "—", patron: "—", summary: "One of the Seven Deadly Sins. Status unknown.", keyTraits: [], note: "" },
    // Notable connected NPCs
    { id: "cendis-npc", name: "Cendis", campaign: "NPCs", role: "connected", status: "deceased", race: "", class: "", patron: "", summary: "Founding member of the New Dawn and the formative figure for NEXUS. The first person who saw NEXUS clearly. Asked the question that became the conceptual heart of NEXUS's character: 'are you your body or your mind or your soul?'", keyTraits: ["The New Dawn's founder figure for NEXUS", "Asked the three-master question"], note: "" },
    { id: "morterra", name: "Morterra", campaign: "NPCs", role: "connected", race: "Rightful deity of death", class: "—", patron: "—", summary: "The rightful deity of the death domain, displaced by Hades' usurpation.", keyTraits: ["Domain stolen by Hades"], note: "" },
    { id: "lathander", name: "Lathander", campaign: "NPCs", role: "connected", race: "God of dawn and renewal", class: "—", patron: "—", summary: "God of dawn and renewal. NEXUS's patron. The light the New Dawn moves toward.", keyTraits: ["NEXUS's patron deity"], note: "" },
    { id: "hirellios", name: "Hirellios", campaign: "NPCs", role: "connected", race: "Deity", class: "—", patron: "—", summary: "Blessed Glass of Night at the summit of Mount Tempest after the three-souls choice.", keyTraits: ["Blessed Glass at Mount Tempest"], note: "" },
    { id: "lathren", name: "Lathren", campaign: "NPCs", role: "connected", race: "", class: "", patron: "", summary: "The one who trapped Bion'Kallios in the void.", keyTraits: ["Sealed Bion'Kallios"], note: "" },
    { id: "sune", name: "Sune", campaign: "NPCs", role: "connected", race: "Former goddess", class: "—", patron: "—", summary: "Lost her godhood to revive Thourmose.", keyTraits: ["Gave up divinity to save Thourmose"], note: "" },
  ],
};

// ============================================================
// STORAGE — Supabase-backed with smart merge
// ============================================================

async function loadContent() {
  try {
    const cached = await loadFromSupabase();
    if (cached) {
      // Merge subclasses: always use the latest structural list from defaults,
      // but preserve any user-edited summary/features/note for entries that match by id.
      const cachedSubsById = {};
      (cached.subclasses || []).forEach((s) => { cachedSubsById[s.id] = s; });
      const mergedSubclasses = DEFAULT_CONTENT.subclasses.map((defaultSub) => {
        const cachedSub = cachedSubsById[defaultSub.id];
        if (!cachedSub) return defaultSub;
        return {
          ...defaultSub,
          name: cachedSub.name && cachedSub.name !== "" ? cachedSub.name : defaultSub.name,
          summary: cachedSub.summary && cachedSub.summary !== "" ? cachedSub.summary : defaultSub.summary,
          features: cachedSub.features && cachedSub.features.length > 0 ? cachedSub.features : defaultSub.features,
          note: cachedSub.note && cachedSub.note !== "" ? cachedSub.note : defaultSub.note,
          pills: cachedSub.pills,
          headings: cachedSub.headings,
          customSections: cachedSub.customSections,
          media: cachedSub.media,
        };
      });
      // Same for races
      const cachedRacesById = {};
      (cached.races || []).forEach((r) => { cachedRacesById[r.id] = r; });
      const mergedRaces = DEFAULT_CONTENT.races.map((defaultRace) => {
        const cachedRace = cachedRacesById[defaultRace.id];
        if (!cachedRace) return defaultRace;
        return {
          ...defaultRace,
          name: cachedRace.name && cachedRace.name !== "" ? cachedRace.name : defaultRace.name,
          tagline: cachedRace.tagline && cachedRace.tagline !== "" ? cachedRace.tagline : defaultRace.tagline,
          description: cachedRace.description && cachedRace.description !== "" ? cachedRace.description : defaultRace.description,
          summary: cachedRace.summary && cachedRace.summary !== "" ? cachedRace.summary : defaultRace.summary,
          traits: cachedRace.traits && cachedRace.traits.length > 0 ? cachedRace.traits : defaultRace.traits,
          archetypes: cachedRace.archetypes && cachedRace.archetypes.length > 0 ? cachedRace.archetypes : defaultRace.archetypes,
          note: cachedRace.note && cachedRace.note !== "" ? cachedRace.note : defaultRace.note,
          pills: cachedRace.pills,
          headings: cachedRace.headings,
          customSections: cachedRace.customSections,
          media: cachedRace.media,
        };
      });
      // Same for characters
      const cachedCharsById = {};
      (cached.characters || []).forEach((c) => { cachedCharsById[c.id] = c; });
      const mergedCharacters = DEFAULT_CONTENT.characters.map((defaultCh) => {
        const cachedCh = cachedCharsById[defaultCh.id];
        if (!cachedCh) return defaultCh;
        return {
          ...defaultCh,
          name: cachedCh.name && cachedCh.name !== "" ? cachedCh.name : defaultCh.name,
          summary: cachedCh.summary && cachedCh.summary !== "" ? cachedCh.summary : defaultCh.summary,
          keyTraits: cachedCh.keyTraits && cachedCh.keyTraits.length > 0 ? cachedCh.keyTraits : defaultCh.keyTraits,
          note: cachedCh.note && cachedCh.note !== "" ? cachedCh.note : defaultCh.note,
          race: cachedCh.race && cachedCh.race !== "" ? cachedCh.race : defaultCh.race,
          class: cachedCh.class && cachedCh.class !== "" ? cachedCh.class : defaultCh.class,
          patron: cachedCh.patron && cachedCh.patron !== "" ? cachedCh.patron : defaultCh.patron,
          pills: cachedCh.pills,
          headings: cachedCh.headings,
          customSections: cachedCh.customSections,
          media: cachedCh.media,
        };
      });
      // Merge classes — preserve user-edited fields, keep structural defaults
      const cachedClassesById = {};
      (cached.classes || []).forEach((c) => { cachedClassesById[c.id] = c; });
      const mergedClasses = DEFAULT_CONTENT.classes.map((defaultCls) => {
        const cachedCls = cachedClassesById[defaultCls.id];
        if (!cachedCls) return defaultCls;
        const preserve = (field) => cachedCls[field] && (Array.isArray(cachedCls[field]) ? cachedCls[field].length > 0 : cachedCls[field] !== "");
        return {
          ...defaultCls,
          name: preserve('name') ? cachedCls.name : defaultCls.name,
          summary: preserve('summary') ? cachedCls.summary : defaultCls.summary,
          coreFeatures: preserve('coreFeatures') ? cachedCls.coreFeatures : defaultCls.coreFeatures,
          progression: preserve('progression') ? cachedCls.progression : defaultCls.progression,
          tableColumns: preserve('tableColumns') ? cachedCls.tableColumns : defaultCls.tableColumns,
          startingHP: preserve('startingHP') ? cachedCls.startingHP : defaultCls.startingHP,
          hpPerLevel: preserve('hpPerLevel') ? cachedCls.hpPerLevel : defaultCls.hpPerLevel,
          armorTraining: preserve('armorTraining') ? cachedCls.armorTraining : defaultCls.armorTraining,
          savingThrows: preserve('savingThrows') ? cachedCls.savingThrows : defaultCls.savingThrows,
          skills: preserve('skills') ? cachedCls.skills : defaultCls.skills,
          weapons: preserve('weapons') ? cachedCls.weapons : defaultCls.weapons,
          startingEquipment: preserve('startingEquipment') ? cachedCls.startingEquipment : defaultCls.startingEquipment,
          notes: preserve('notes') ? cachedCls.notes : defaultCls.notes,
          pills: cachedCls.pills,
          headings: cachedCls.headings,
          customSections: cachedCls.customSections,
          media: cachedCls.media,
        };
      });
      return {
        ...DEFAULT_CONTENT,
        ...cached,
        // Always trust the canonical orderings from defaults
        parentClassOrder: DEFAULT_CONTENT.parentClassOrder,
        raceOrder: DEFAULT_CONTENT.raceOrder,
        campaignOrder: DEFAULT_CONTENT.campaignOrder,
        campaigns: DEFAULT_CONTENT.campaigns,
        // Use the smart-merged lists
        subclasses: mergedSubclasses,
        races: mergedRaces,
        characters: mergedCharacters,
        classes: mergedClasses,
      };
    }
  } catch (e) {
    // Key doesn't exist yet — return defaults
  }
  return DEFAULT_CONTENT;
}

async function saveContent(content) {
  try {
    await saveToSupabase(content);
    return true;
  } catch (e) {
    console.error('Save failed:', e);
    return false;
  }
}

// ============================================================
// STYLING — 5.5e inspired
// ============================================================
const styles = {
  page: {
    fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
    background: '#f5ecd9',
    backgroundImage: `
      radial-gradient(circle at 20% 10%, rgba(139, 69, 19, 0.04) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(101, 67, 33, 0.05) 0%, transparent 50%),
      repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139, 69, 19, 0.015) 2px, rgba(139, 69, 19, 0.015) 4px)
    `,
    minHeight: '100vh',
    color: '#3b2615',
  },
  header: {
    background: 'linear-gradient(180deg, #7a1f1f 0%, #5c1414 100%)',
    color: '#f5ecd9',
    padding: '24px 32px',
    borderBottom: '4px double #c9a55c',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  title: {
    fontFamily: '"Cinzel", "Trajan Pro", "Palatino Linotype", serif',
    fontSize: '36px',
    fontWeight: 700,
    letterSpacing: '0.05em',
    margin: 0,
    textShadow: '2px 2px 4px rgba(0,0,0,0.4)',
  },
  subtitle: {
    fontFamily: '"Palatino Linotype", serif',
    fontStyle: 'italic',
    fontSize: '15px',
    color: '#e8d5a0',
    margin: '4px 0 0 0',
    letterSpacing: '0.02em',
  },
  layout: {
    display: 'flex',
    height: 'calc(100vh - 100px)',
    overflow: 'hidden',
  },
  sidebar: {
    width: '260px',
    background: 'linear-gradient(180deg, #e8d5a0 0%, #d9bf7f 100%)',
    borderRight: '3px solid #8b6914',
    padding: '20px 0',
    overflowY: 'auto',
    height: '100%',
    boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.1)',
    flexShrink: 0,
  },
  navItem: {
    padding: '10px 20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '15px',
    color: '#3b2615',
    borderLeft: '4px solid transparent',
    transition: 'all 0.15s ease',
    fontFamily: '"Palatino Linotype", serif',
  },
  navItemActive: {
    background: 'rgba(122, 31, 31, 0.15)',
    borderLeft: '4px solid #7a1f1f',
    fontWeight: 700,
  },
  navSub: {
    padding: '6px 20px 6px 50px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#5c4020',
    fontStyle: 'italic',
    transition: 'all 0.15s ease',
  },
  navSubActive: {
    color: '#7a1f1f',
    fontWeight: 700,
    fontStyle: 'normal',
  },
  main: {
    flex: 1,
    padding: '32px 48px',
    overflowY: 'auto',
    height: '100%',
    boxSizing: 'border-box',
  },
  mainInner: {
    maxWidth: '900px',
  },
  pageHeading: {
    fontFamily: '"Cinzel", "Trajan Pro", serif',
    fontSize: '32px',
    color: '#7a1f1f',
    borderBottom: '2px solid #c9a55c',
    paddingBottom: '8px',
    marginBottom: '20px',
    letterSpacing: '0.03em',
  },
  sectionHeading: {
    fontFamily: '"Cinzel", "Trajan Pro", serif',
    fontSize: '22px',
    color: '#5c1414',
    marginTop: '28px',
    marginBottom: '12px',
    borderBottom: '1px solid #c9a55c',
    paddingBottom: '4px',
  },
  subHeading: {
    fontFamily: '"Palatino Linotype", serif',
    fontSize: '18px',
    color: '#5c1414',
    fontWeight: 700,
    marginTop: '16px',
    marginBottom: '6px',
    fontStyle: 'italic',
  },
  bodyText: {
    fontSize: '15px',
    lineHeight: 1.6,
    color: '#3b2615',
    marginBottom: '10px',
  },
  card: {
    background: 'rgba(255, 251, 240, 0.6)',
    border: '1px solid #c9a55c',
    borderRadius: '2px',
    padding: '16px 20px',
    marginBottom: '12px',
    boxShadow: '0 1px 3px rgba(139, 69, 19, 0.1)',
  },
  featureCard: {
    background: 'rgba(245, 236, 217, 0.5)',
    borderLeft: '4px solid #7a1f1f',
    padding: '12px 16px',
    marginBottom: '10px',
  },
  featureLevel: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#7a1f1f',
    fontWeight: 700,
  },
  featureName: {
    fontFamily: '"Cinzel", serif',
    fontSize: '17px',
    color: '#3b2615',
    fontWeight: 700,
    margin: '2px 0 4px 0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '20px',
    fontSize: '13px',
  },
  th: {
    background: '#7a1f1f',
    color: '#f5ecd9',
    padding: '8px 10px',
    textAlign: 'left',
    fontFamily: '"Cinzel", serif',
    fontSize: '12px',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  td: {
    padding: '6px 10px',
    borderBottom: '1px solid #d9bf7f',
  },
  searchBox: {
    width: 'calc(100% - 24px)',
    margin: '0 12px 16px 12px',
    padding: '8px 12px',
    fontFamily: '"Palatino Linotype", serif',
    fontSize: '14px',
    background: '#fff8e7',
    border: '1px solid #8b6914',
    borderRadius: '2px',
    color: '#3b2615',
  },
  navSection: {
    padding: '6px 20px',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#8b6914',
    fontWeight: 700,
    marginTop: '12px',
  },
  navSectionToggle: {
    padding: '10px 20px 6px 20px',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#5c1414',
    fontWeight: 700,
    marginTop: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: '"Cinzel", serif',
    borderBottom: '1px solid rgba(139, 105, 20, 0.3)',
    paddingBottom: '8px',
    transition: 'color 0.15s',
  },
  navSectionToggleCount: {
    marginLeft: 'auto',
    fontSize: '10px',
    color: '#8b6914',
    fontWeight: 400,
    fontStyle: 'italic',
    textTransform: 'none',
    letterSpacing: '0',
  },
  button: {
    background: '#7a1f1f',
    color: '#f5ecd9',
    border: 'none',
    padding: '6px 14px',
    fontFamily: '"Cinzel", serif',
    fontSize: '13px',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    borderRadius: '2px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  buttonGhost: {
    background: 'transparent',
    color: '#7a1f1f',
    border: '1px solid #7a1f1f',
    padding: '6px 14px',
    fontFamily: '"Cinzel", serif',
    fontSize: '13px',
    cursor: 'pointer',
    borderRadius: '2px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  textarea: {
    width: '100%',
    minHeight: '120px',
    padding: '10px',
    fontFamily: '"Palatino Linotype", serif',
    fontSize: '14px',
    background: '#fff8e7',
    border: '1px solid #8b6914',
    borderRadius: '2px',
    color: '#3b2615',
    boxSizing: 'border-box',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    fontFamily: '"Palatino Linotype", serif',
    fontSize: '14px',
    background: '#fff8e7',
    border: '1px solid #8b6914',
    borderRadius: '2px',
    color: '#3b2615',
    boxSizing: 'border-box',
    marginBottom: '8px',
  },
  pill: {
    display: 'inline-block',
    background: '#7a1f1f',
    color: '#f5ecd9',
    padding: '2px 10px',
    fontSize: '11px',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    borderRadius: '2px',
    marginRight: '6px',
    fontFamily: '"Cinzel", serif',
  },
  pillPriority: {
    display: 'inline-block',
    background: '#c9a55c',
    color: '#3b2615',
    padding: '1px 6px',
    fontSize: '9px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    borderRadius: '2px',
    marginLeft: '6px',
    fontFamily: '"Cinzel", serif',
    fontWeight: 700,
  },
  parentGroup: {
    padding: '6px 20px 6px 32px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#3b2615',
    fontWeight: 700,
    fontFamily: '"Cinzel", serif',
    letterSpacing: '0.04em',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background 0.1s',
  },
  parentGroupActive: {
    background: 'rgba(122, 31, 31, 0.08)',
    color: '#7a1f1f',
  },
  subGroup: {
    padding: '4px 20px 4px 44px',
    cursor: 'default',
    fontSize: '11px',
    color: '#5c4020',
    fontWeight: 700,
    fontFamily: '"Cinzel", serif',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '4px',
  },
  subclassChild: {
    padding: '4px 20px 4px 56px',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#5c4020',
    fontStyle: 'italic',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
  },
  subclassChildActive: {
    color: '#7a1f1f',
    fontWeight: 700,
    fontStyle: 'normal',
    background: 'rgba(122, 31, 31, 0.1)',
  },
  subclassGrandchild: {
    padding: '3px 20px 3px 68px',
    cursor: 'pointer',
    fontSize: '11px',
    color: '#8b6914',
    fontStyle: 'italic',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
  },
  emptyMarker: {
    color: '#a08550',
    fontSize: '10px',
    marginLeft: '6px',
    fontStyle: 'italic',
  },
  saveStatus: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '8px 16px',
    background: '#3b2615',
    color: '#f5ecd9',
    fontFamily: '"Palatino Linotype", serif',
    fontSize: '13px',
    borderRadius: '2px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    opacity: 0,
    transition: 'opacity 0.3s',
    pointerEvents: 'none',
  },
  saveStatusVisible: {
    opacity: 1,
  },
};

// ============================================================
// PILL PRESETS — named color swatches for editable pills
// ============================================================
const PILL_PRESETS = [
  { name: 'Crimson', bg: '#7a1f1f', fg: '#f5ecd9' },
  { name: 'Gold',    bg: '#c9a55c', fg: '#3b2615' },
  { name: 'Bronze',  bg: '#8b6914', fg: '#f5ecd9' },
  { name: 'Shadow',  bg: '#3b2615', fg: '#f5ecd9' },
  { name: 'Slate',   bg: '#5c4020', fg: '#f5ecd9' },
  { name: 'Forest',  bg: '#5c8a3a', fg: '#f5ecd9' },
  { name: 'Azure',   bg: '#3a5c8a', fg: '#f5ecd9' },
  { name: 'Bone',    bg: '#e8d5a0', fg: '#3b2615' },
];

const pillStyleFromColor = (color) => {
  const preset = PILL_PRESETS.find((p) => p.name === color) || PILL_PRESETS[0];
  return { ...styles.pill, background: preset.bg, color: preset.fg };
};

// ============================================================
// EDITABLE PILL — display + edit affordances
// ============================================================
function EditablePill({ pill, editMode, onChange, onRemove }) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const baseStyle = pillStyleFromColor(pill.color || 'Crimson');
  if (!editMode) {
    return <span style={baseStyle}>{pill.label}</span>;
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px', marginBottom: '4px',
      background: baseStyle.background, color: baseStyle.color, borderRadius: '2px',
      padding: '1px 2px 1px 6px', position: 'relative' }}>
      <input
        value={pill.label}
        onChange={(e) => onChange({ ...pill, label: e.target.value })}
        placeholder="Tag…"
        style={{ background: 'transparent', color: baseStyle.color, border: 'none', outline: 'none',
          fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.05em',
          textTransform: 'uppercase', padding: '1px 4px', width: `${Math.max(6, (pill.label || '').length + 1)}ch` }}
      />
      <button onClick={() => setPickerOpen(!pickerOpen)} title="Change color"
        style={{ background: 'rgba(0,0,0,0.15)', color: baseStyle.color, border: 'none',
          padding: '0 6px', cursor: 'pointer', fontSize: '11px', borderRadius: '2px', margin: '0 2px' }}>◆</button>
      <button onClick={onRemove} title="Remove"
        style={{ background: 'rgba(0,0,0,0.25)', color: baseStyle.color, border: 'none',
          padding: '0 6px', cursor: 'pointer', fontSize: '11px', borderRadius: '2px' }}>✕</button>
      {pickerOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50,
          background: '#f5ecd9', border: '1px solid #8b6914', borderRadius: '2px',
          padding: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px', width: '160px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)', marginTop: '2px' }}>
          {PILL_PRESETS.map((p) => (
            <button key={p.name} onClick={() => { onChange({ ...pill, color: p.name }); setPickerOpen(false); }}
              title={p.name}
              style={{ width: '24px', height: '24px', background: p.bg, color: p.fg,
                border: pill.color === p.name ? '2px solid #3b2615' : '1px solid #8b6914',
                borderRadius: '2px', cursor: 'pointer', fontSize: '10px', padding: 0 }}>
              {pill.color === p.name ? '✓' : ''}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

// ============================================================
// PILL ROW — list of pills + "add pill" button in edit mode
// ============================================================
function PillRow({ pills, editMode, onChange }) {
  const list = pills || [];
  const update = (i, p) => onChange(list.map((x, idx) => idx === i ? p : x));
  const remove = (i) => onChange(list.filter((_, idx) => idx !== i));
  const add = () => onChange([...list, { label: 'New Tag', color: 'Crimson' }]);
  if (!editMode && list.length === 0) return null;
  return (
    <div style={{ marginBottom: '14px', display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
      {list.map((p, i) => (
        <EditablePill key={i} pill={p} editMode={editMode}
          onChange={(np) => update(i, np)} onRemove={() => remove(i)} />
      ))}
      {editMode && (
        <button onClick={add}
          style={{ background: 'transparent', color: '#7a1f1f', border: '1px dashed #7a1f1f',
            padding: '2px 10px', fontSize: '11px', fontFamily: '"Cinzel", serif',
            letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
            borderRadius: '2px', marginBottom: '4px' }}>+ Add Tag</button>
      )}
    </div>
  );
}

// ============================================================
// EDITABLE HEADING — h1/h2 with inline editing in edit mode
// ============================================================
function EditableHeading({ as = 'h2', value, defaultValue, onChange, editMode, style }) {
  const Tag = as;
  const text = value || defaultValue;
  if (!editMode) {
    return <Tag style={style}>{text}</Tag>;
  }
  return (
    <input
      value={text}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...style, background: '#fff8e7', border: '1px dashed #8b6914',
        outline: 'none', padding: '4px 8px', width: '100%', boxSizing: 'border-box',
        fontFamily: style?.fontFamily || '"Cinzel", serif' }}
    />
  );
}

// ============================================================
// CUSTOM SECTIONS — user-added named sections (text or feature-card)
// ============================================================
function CustomSections({ sections, editMode, onChange, headingStyle, category, entryId }) {
  const list = sections || [];
  const updateSection = (i, fields) => onChange(list.map((s, idx) => idx === i ? { ...s, ...fields } : s));
  const removeSection = (i) => onChange(list.filter((_, idx) => idx !== i));
  const moveSection = (i, dir) => {
    const ni = i + dir;
    if (ni < 0 || ni >= list.length) return;
    const arr = [...list];
    [arr[i], arr[ni]] = [arr[ni], arr[i]];
    onChange(arr);
  };
  const addTextSection = () => onChange([...list, { id: `sec-${Date.now()}`, heading: 'New Section', type: 'text', body: '' }]);
  const addFeatureSection = () => onChange([...list, { id: `sec-${Date.now()}`, heading: 'New Section', type: 'features', features: [] }]);

  const updateFeature = (sectionIdx, featIdx, fields) => {
    const features = (list[sectionIdx].features || []).map((f, idx) => idx === featIdx ? { ...f, ...fields } : f);
    updateSection(sectionIdx, { features });
  };
  const addFeature = (sectionIdx) => {
    const features = [...(list[sectionIdx].features || []), { level: 1, name: 'New Feature', text: '' }];
    updateSection(sectionIdx, { features });
  };
  const removeFeature = (sectionIdx, featIdx) => {
    const features = (list[sectionIdx].features || []).filter((_, idx) => idx !== featIdx);
    updateSection(sectionIdx, { features });
  };

  return (
    <>
      {list.map((sec, i) => (
        <div key={sec.id || i} style={{ marginTop: '28px', clear: 'both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <EditableHeading as="h2"
                value={sec.heading}
                defaultValue="Section"
                onChange={(v) => updateSection(i, { heading: v })}
                editMode={editMode}
                style={headingStyle}
              />
            </div>
            {editMode && (
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button onClick={() => moveSection(i, -1)} title="Move up"
                  style={{ background: '#8b6914', color: '#f5ecd9', border: 'none', padding: '4px 8px',
                    cursor: 'pointer', borderRadius: '2px', fontSize: '11px' }}>▲</button>
                <button onClick={() => moveSection(i, 1)} title="Move down"
                  style={{ background: '#8b6914', color: '#f5ecd9', border: 'none', padding: '4px 8px',
                    cursor: 'pointer', borderRadius: '2px', fontSize: '11px' }}>▼</button>
                <button onClick={() => removeSection(i)} title="Remove section"
                  style={{ background: '#8b1414', color: '#f5ecd9', border: 'none', padding: '4px 10px',
                    cursor: 'pointer', borderRadius: '2px', fontSize: '11px' }}>✕</button>
              </div>
            )}
          </div>

          <div style={{ overflow: 'auto' }}>
            <FloatingImage
              media={sec.media}
              editMode={editMode}
              onChange={(m) => updateSection(i, { media: m })}
              category={category}
              entryId={`${entryId}-${sec.id || i}`}
            />

            {sec.type === 'text' ? (
              editMode ? (
                <textarea style={{ ...styles.textarea, minHeight: '100px' }} value={sec.body || ''}
                  placeholder="Section content…"
                  onChange={(e) => updateSection(i, { body: e.target.value })} />
              ) : sec.body ? (
                <p style={styles.bodyText}>{sec.body}</p>
              ) : null
            ) : (
              <>
                {(sec.features || []).map((f, fi) => (
                  <div key={fi} style={styles.featureCard}>
                    {editMode ? (
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#8b6914' }}>Lvl</span>
                      <input type="number" value={f.level || 1}
                        onChange={(e) => updateFeature(i, fi, { level: parseInt(e.target.value) || 1 })}
                        style={{ ...styles.textarea, width: '60px', minHeight: 'unset', padding: '4px 8px' }} />
                      <input value={f.name || ''}
                        onChange={(e) => updateFeature(i, fi, { name: e.target.value })}
                        placeholder="Feature name"
                        style={{ ...styles.textarea, flex: 1, minHeight: 'unset', padding: '4px 8px' }} />
                      <button onClick={() => removeFeature(i, fi)}
                        style={{ background: '#8b1414', color: '#f5ecd9', border: 'none',
                          borderRadius: '2px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                    </div>
                  ) : <>
                    <div style={styles.featureLevel}>Level {f.level}</div>
                    <div style={styles.featureName}>{f.name}</div>
                  </>}
                  {editMode ? (
                    <textarea style={{ ...styles.textarea, minHeight: '80px' }} value={f.text || ''}
                      placeholder="Feature mechanics…"
                      onChange={(e) => updateFeature(i, fi, { text: e.target.value })} />
                  ) : (
                    <p style={{ ...styles.bodyText, margin: 0 }}>{f.text}</p>
                  )}
                </div>
              ))}
              {editMode && (
                <button onClick={() => addFeature(i)}
                  style={{ ...styles.button, marginTop: '6px', fontSize: '12px', padding: '6px 16px' }}>
                  + Add Feature Card
                </button>
              )}
            </>
          )}
          </div>
        </div>
      ))}

      {editMode && (
        <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap',
          padding: '10px', background: 'rgba(201, 165, 92, 0.1)', border: '1px dashed #8b6914', borderRadius: '2px' }}>
          <span style={{ fontSize: '11px', color: '#8b6914', textTransform: 'uppercase',
            letterSpacing: '0.08em', alignSelf: 'center', marginRight: '8px' }}>Add Custom Section:</span>
          <button onClick={addTextSection}
            style={{ ...styles.button, fontSize: '12px', padding: '6px 14px' }}>+ Text Section</button>
          <button onClick={addFeatureSection}
            style={{ ...styles.button, fontSize: '12px', padding: '6px 14px' }}>+ Feature Card Section</button>
        </div>
      )}
    </>
  );
}

// ============================================================
// FLOATING IMAGE — book-style illustration with text wrap
// ============================================================
// Storage shape: media = { url, path?, shape: 'portrait'|'landscape', scale, offsetX, offsetY }
// `shape` controls the frame aspect ratio (3:4 portrait, 16:9 landscape).
// `scale` (1..3) zooms the image within the frame; `offsetX/Y` (-50..50) pans it.
// All values render via object-fit: cover + object-position.

const IMAGE_FRAMES = {
  portrait:  { width: 200, height: 280 },
  landscape: { width: 320, height: 180 },
};

function FloatingImage({ media, editMode, onChange, category, entryId }) {
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState('');
  const [showControls, setShowControls] = React.useState(false);
  const fileInputRef = React.useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const { url, path } = await uploadImage(file, category, entryId);
      // If replacing an existing image, delete the old one
      if (media?.path) {
        deleteImage(media.path).catch(() => {});
      }
      onChange({
        url,
        path,
        shape: media?.shape || 'portrait',
        scale: media?.scale ?? 1,
        offsetX: media?.offsetX ?? 0,
        offsetY: media?.offsetY ?? 0,
      });
    } catch (err) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    if (media?.path) deleteImage(media.path).catch(() => {});
    onChange(null);
    setShowControls(false);
  };

  // ── Display mode: no image, no edit mode → render nothing ────────────
  if (!media?.url && !editMode) return null;

  // ── Edit mode, no image: show upload placeholder ─────────────────────
  if (!media?.url && editMode) {
    return (
      <div style={{
        float: 'left',
        width: IMAGE_FRAMES.portrait.width,
        height: IMAGE_FRAMES.portrait.height,
        marginRight: '16px',
        marginBottom: '12px',
        border: '2px dashed #8b6914',
        borderRadius: '2px',
        background: 'rgba(201, 165, 92, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer',
        padding: '12px',
        textAlign: 'center',
      }}
      onClick={() => fileInputRef.current?.click()}
      >
        <ImageIcon size={32} color="#8b6914" />
        <div style={{ fontFamily: '"Cinzel", serif', fontSize: '11px',
          color: '#5c4020', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {uploading ? 'Uploading…' : 'Add Illustration'}
        </div>
        {uploadError && (
          <div style={{ fontSize: '11px', color: '#8b1414', fontStyle: 'italic' }}>{uploadError}</div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>
    );
  }

  // ── Image present: render with float and (in edit mode) controls ─────
  const shape = media.shape || 'portrait';
  const frame = IMAGE_FRAMES[shape];
  const scale = media.scale ?? 1;
  const offsetX = media.offsetX ?? 0;
  const offsetY = media.offsetY ?? 0;

  return (
    <div style={{
      float: 'left',
      width: frame.width,
      marginRight: '16px',
      marginBottom: '12px',
      position: 'relative',
    }}>
      <div style={{
        width: frame.width,
        height: frame.height,
        overflow: 'hidden',
        borderRadius: '2px',
        position: 'relative',
      }}>
        <img
          src={media.url}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `${50 + offsetX}% ${50 + offsetY}%`,
            transform: `scale(${scale})`,
            transformOrigin: 'center',
          }}
        />
      </div>

      {editMode && (
        <>
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => setShowControls(!showControls)}
              style={{ ...styles.button, fontSize: '10px', padding: '3px 8px' }}>
              {showControls ? 'Hide' : 'Adjust'}
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              style={{ ...styles.button, fontSize: '10px', padding: '3px 8px' }}>
              {uploading ? '…' : 'Replace'}
            </button>
            <button onClick={handleRemove}
              style={{ background: '#8b1414', color: '#f5ecd9', border: 'none',
                borderRadius: '2px', padding: '3px 8px', cursor: 'pointer',
                fontSize: '10px', fontFamily: '"Cinzel", serif',
                letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Remove
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files?.[0])} />

          {showControls && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              background: 'rgba(201, 165, 92, 0.15)',
              border: '1px solid #8b6914',
              borderRadius: '2px',
              fontSize: '11px',
              color: '#3b2615',
            }}>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontFamily: '"Cinzel", serif', fontSize: '10px',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: '#5c4020', marginBottom: '3px' }}>Shape</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => onChange({ ...media, shape: 'portrait' })}
                    style={{
                      flex: 1, padding: '3px 6px', fontSize: '10px', cursor: 'pointer',
                      border: shape === 'portrait' ? '2px solid #7a1f1f' : '1px solid #8b6914',
                      background: shape === 'portrait' ? '#7a1f1f' : 'transparent',
                      color: shape === 'portrait' ? '#f5ecd9' : '#3b2615',
                      fontFamily: '"Cinzel", serif', textTransform: 'uppercase',
                      letterSpacing: '0.05em', borderRadius: '2px',
                    }}>Portrait</button>
                  <button onClick={() => onChange({ ...media, shape: 'landscape' })}
                    style={{
                      flex: 1, padding: '3px 6px', fontSize: '10px', cursor: 'pointer',
                      border: shape === 'landscape' ? '2px solid #7a1f1f' : '1px solid #8b6914',
                      background: shape === 'landscape' ? '#7a1f1f' : 'transparent',
                      color: shape === 'landscape' ? '#f5ecd9' : '#3b2615',
                      fontFamily: '"Cinzel", serif', textTransform: 'uppercase',
                      letterSpacing: '0.05em', borderRadius: '2px',
                    }}>Landscape</button>
                </div>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  fontFamily: '"Cinzel", serif', fontSize: '10px',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: '#5c4020', marginBottom: '3px' }}>
                  <span>Zoom</span><span>{scale.toFixed(2)}×</span>
                </div>
                <input type="range" min="1" max="3" step="0.05" value={scale}
                  onChange={(e) => onChange({ ...media, scale: parseFloat(e.target.value) })}
                  style={{ width: '100%' }} />
              </div>

              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  fontFamily: '"Cinzel", serif', fontSize: '10px',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: '#5c4020', marginBottom: '3px' }}>
                  <span>Pan X</span><span>{offsetX}</span>
                </div>
                <input type="range" min="-50" max="50" step="1" value={offsetX}
                  onChange={(e) => onChange({ ...media, offsetX: parseInt(e.target.value) })}
                  style={{ width: '100%' }} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  fontFamily: '"Cinzel", serif', fontSize: '10px',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: '#5c4020', marginBottom: '3px' }}>
                  <span>Pan Y</span><span>{offsetY}</span>
                </div>
                <input type="range" min="-50" max="50" step="1" value={offsetY}
                  onChange={(e) => onChange({ ...media, offsetY: parseInt(e.target.value) })}
                  style={{ width: '100%' }} />
              </div>

              <button onClick={() => onChange({ ...media, scale: 1, offsetX: 0, offsetY: 0 })}
                style={{ ...styles.button, fontSize: '10px', padding: '3px 8px',
                  marginTop: '6px', width: '100%' }}>
                Reset Zoom &amp; Pan
              </button>
            </div>
          )}

          {uploadError && (
            <div style={{ fontSize: '11px', color: '#8b1414', fontStyle: 'italic', marginTop: '4px' }}>
              {uploadError}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// LEGACY PILL CONVERSION — migrate old hardcoded pills to editable model
// ============================================================
const subclassDefaultPills = (sub) => {
  const out = [];
  if (sub.parentClass) out.push({ label: `${sub.parentClass} Subclass`, color: 'Crimson' });
  if (sub.priority === 'highest') out.push({ label: 'Priority Rewrite — Tier 1', color: 'Gold' });
  if (sub.priority === 'second')  out.push({ label: 'Priority Rewrite — Tier 2', color: 'Gold' });
  return out;
};

const classDefaultPills = (cls) => {
  const out = [];
  if (cls.hitDie) out.push({ label: `Hit Die: ${cls.hitDie}`, color: 'Crimson' });
  if (cls.primary) out.push({ label: `Primary: ${cls.primary}`, color: 'Crimson' });
  return out;
};

const raceDefaultPills = (race) => {
  const out = [];
  if (race.parentRace && !race.isParent && race.parentRace !== race.name) {
    out.push({ label: `${race.parentRace} Subrace`, color: 'Crimson' });
  }
  return out;
};

const characterDefaultPills = (ch) => {
  const out = [];
  if (ch.campaign)              out.push({ label: ch.campaign, color: 'Crimson' });
  if (ch.role === 'player')     out.push({ label: 'Player Character', color: 'Slate' });
  if (ch.role === 'connected')  out.push({ label: 'Connected', color: 'Bronze' });
  if (ch.role === 'enemy')      out.push({ label: 'Enemy', color: 'Crimson' });
  if (ch.status === 'deceased') out.push({ label: 'Deceased', color: 'Shadow' });
  if (ch.status === 'freed')    out.push({ label: 'Freed', color: 'Forest' });
  if (ch.category)              out.push({ label: ch.category, color: 'Gold' });
  return out;
};

// ============================================================
// MAIN APP
// ============================================================
export default function Compendium() {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('home'); // home, campaign, races, classes, subclasses, characters
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [expandedClasses, setExpandedClasses] = useState(new Set());
  const [expandedRaces, setExpandedRaces] = useState(new Set());
  const [expandedCampaigns, setExpandedCampaigns] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState(new Set()); // collapsed by default

  const toggleCampaignExpanded = (campaign) => {
    setExpandedCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(campaign)) next.delete(campaign);
      else next.add(campaign);
      return next;
    });
  };

  const toggleRaceExpanded = (parentRace) => {
    setExpandedRaces((prev) => {
      const next = new Set(prev);
      if (next.has(parentRace)) next.delete(parentRace);
      else next.add(parentRace);
      return next;
    });
  };

  const toggleSectionExpanded = (section) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const toggleClassExpanded = (parentClass) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(parentClass)) next.delete(parentClass);
      else next.add(parentClass);
      return next;
    });
  };

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [dmAuthed, setDmAuthed] = useState(isDMAuthenticated());

  useEffect(() => {
    loadContent().then((c) => {
      setContent(c);
      setLoading(false);
    });
    // Subscribe to real-time updates from other clients
    const unsubscribe = subscribeToUpdates((remoteContent) => {
      setContent((current) => mergeContent(remoteContent, current));
    });
    return unsubscribe;
  }, []);

  // Merge incoming remote content with local defaults (same smart-merge logic as loadContent)
  const mergeContent = (cached, _current) => {
    if (!cached) return DEFAULT_CONTENT;
    return {
      ...DEFAULT_CONTENT,
      ...cached,
      parentClassOrder: DEFAULT_CONTENT.parentClassOrder,
      raceOrder: DEFAULT_CONTENT.raceOrder,
      campaignOrder: DEFAULT_CONTENT.campaignOrder,
      campaigns: DEFAULT_CONTENT.campaigns,
    };
  };

  const handleEditToggle = () => {
    console.log('[CotR] handleEditToggle called. editMode:', editMode, 'dmAuthed:', dmAuthed);
    if (editMode) {
      setEditMode(false);
      return;
    }
    if (dmAuthed) {
      console.log('[CotR] Setting editMode to true');
      setEditMode(true);
    } else {
      console.log('[CotR] Showing password modal');
      setShowPasswordModal(true);
    }
  };

  const handlePasswordSubmit = () => {
    if (authenticateDM(passwordInput)) {
      setDmAuthed(true);
      setEditMode(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password.');
    }
  };

  const handlePasswordKeyDown = (e) => {
    if (e.key === 'Enter') handlePasswordSubmit();
    if (e.key === 'Escape') { setShowPasswordModal(false); setPasswordInput(''); setPasswordError(''); }
  };

  const persistChange = async (newContent) => {
    setContent(newContent);
    const ok = await saveContent(newContent);
    setSaveStatus(ok ? 'Saved' : 'Save failed');
    setTimeout(() => setSaveStatus(''), 1500);
  };

  // Search filter
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const hits = [];
    content.races.forEach((r) => {
      const matches = r.name.toLowerCase().includes(q)
        || r.description?.toLowerCase().includes(q)
        || r.summary?.toLowerCase().includes(q)
        || r.tagline?.toLowerCase().includes(q)
        || (r.parentRace && r.parentRace.toLowerCase().includes(q));
      if (matches) {
        const isSubrace = r.parentRace && !r.isParent && r.parentRace !== r.name;
        hits.push({
          type: isSubrace ? 'Subrace' : 'Race',
          id: r.id,
          name: r.name,
          section: 'races',
          parent: isSubrace ? r.parentRace : null,
        });
      }
    });
    content.classes.forEach((c) => {
      if (c.name.toLowerCase().includes(q) || c.summary?.toLowerCase().includes(q)) {
        hits.push({ type: 'Class', id: c.id, name: c.name, section: 'classes' });
      }
    });
    content.subclasses.forEach((s) => {
      if (s.name.toLowerCase().includes(q) || s.summary?.toLowerCase().includes(q) || s.parentClass?.toLowerCase().includes(q)) {
        hits.push({ type: 'Subclass', id: s.id, name: s.name, section: 'subclasses', parent: s.parentClass });
      }
    });
    content.characters.forEach((ch) => {
      const matches = ch.name.toLowerCase().includes(q)
        || ch.summary?.toLowerCase().includes(q)
        || ch.campaign?.toLowerCase().includes(q)
        || ch.race?.toLowerCase().includes(q)
        || ch.class?.toLowerCase().includes(q)
        || (ch.keyTraits || []).some((t) => t.toLowerCase().includes(q));
      if (matches) {
        hits.push({ type: 'Character', id: ch.id, name: ch.name, section: 'characters', parent: ch.campaign });
      }
    });
    return hits;
  }, [search, content]);

  if (loading) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ fontFamily: '"Cinzel", serif', fontSize: '20px', color: '#7a1f1f' }}>Opening the tome…</div>
      </div>
    );
  }

  const goTo = (sect, id = null) => {
    setSection(sect);
    setActiveId(id);
    setSearch('');
    // Auto-expand the top-level section in the sidebar
    if (['races', 'classes', 'subclasses', 'characters'].includes(sect)) {
      setExpandedSections((prev) => {
        const next = new Set(prev);
        next.add(sect);
        return next;
      });
    }
    // Auto-expand the parent class group when navigating to a subclass
    if (sect === 'subclasses' && id) {
      const sub = content.subclasses.find((s) => s.id === id);
      if (sub) {
        setExpandedClasses((prev) => {
          const next = new Set(prev);
          next.add(sub.parentClass);
          return next;
        });
      }
    }
    // Auto-expand the parent race group when navigating to a race/subrace
    if (sect === 'races' && id) {
      const race = content.races.find((r) => r.id === id);
      if (race && race.parentRace) {
        setExpandedRaces((prev) => {
          const next = new Set(prev);
          next.add(race.parentRace);
          return next;
        });
      }
    }
    // Auto-expand the parent campaign when navigating to a character
    if (sect === 'characters' && id) {
      const ch = content.characters.find((c) => c.id === id);
      if (ch && ch.campaign) {
        setExpandedCampaigns((prev) => {
          const next = new Set(prev);
          next.add(ch.campaign);
          return next;
        });
      }
    }
  };

  return (
    <div style={styles.page}>
      <Header content={content} editMode={editMode} onEditToggle={handleEditToggle} onMetaChange={(meta) => persistChange({ ...content, meta })} />

      <div style={styles.layout}>
        <aside style={styles.sidebar}>
          <input
            style={styles.searchBox}
            placeholder="Search the tome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <NavItem icon={<Home size={16} />} label="Home" active={section === 'home'} onClick={() => goTo('home')} />
          <NavItem icon={<ScrollText size={16} />} label="Campaign" active={section === 'campaign'} onClick={() => goTo('campaign')} />

          <SectionToggle
            label="Races"
            count={content.races.filter((r) => r.isParent).length}
            expanded={expandedSections.has('races')}
            onClick={() => toggleSectionExpanded('races')}
          />
          {expandedSections.has('races') && (() => {
            const order = content.raceOrder || [];
            return (
              <>
                {order.map((parentRace) => {
                  const racesInFamily = content.races.filter((r) => r.parentRace === parentRace);
                  if (racesInFamily.length === 0) return null;
                  const parent = racesInFamily.find((r) => r.isParent);
                  if (!parent) return null;
                  const isActive = section === 'races' && activeId === parent.id;
                  return (
                    <div
                      key={parentRace}
                      style={{ ...styles.parentGroup, ...(isActive ? styles.parentGroupActive : {}) }}
                      onClick={() => goTo('races', parent.id)}
                    >
                      {parent.name}
                    </div>
                  );
                })}
              </>
            );
          })()}

          <SectionToggle
            label="Classes"
            count={content.classes.length}
            expanded={expandedSections.has('classes')}
            onClick={() => toggleSectionExpanded('classes')}
          />
          {expandedSections.has('classes') && content.classes.map((c) => {
            const isActive = section === 'classes' && activeId === c.id;
            return (
              <div
                key={c.id}
                style={{ ...styles.parentGroup, ...(isActive ? styles.parentGroupActive : {}) }}
                onClick={() => goTo('classes', c.id)}
              >
                {c.name}
              </div>
            );
          })}

          <SectionToggle
            label="Subclasses"
            count={content.subclasses.length}
            expanded={expandedSections.has('subclasses')}
            onClick={() => toggleSectionExpanded('subclasses')}
          />
          {expandedSections.has('subclasses') && content.parentClassOrder.map((parentClass) => {
            const subsForClass = content.subclasses.filter((s) => s.parentClass === parentClass);
            if (subsForClass.length === 0) return null;
            // Sort: anti-divine pinned first (authoritative), then alphabetical
            const sortedSubs = [...subsForClass].sort((a, b) => {
              const aAd = !!a.antiDivine;
              const bAd = !!b.antiDivine;
              if (aAd && !bAd) return -1;
              if (!aAd && bAd) return 1;
              return (a.name || '').localeCompare(b.name || '');
            });
            const isExpanded = expandedClasses.has(parentClass);
            const hasActive = section === 'subclasses' && sortedSubs.some((s) => s.id === activeId);

            // ── Render a single subclass row, including any nested knighthoods ────
            const renderSub = (s) => {
              const isActive = section === 'subclasses' && activeId === s.id;
              const isEmpty = !s.summary && (!s.features || s.features.length === 0);
              const hasKnighthoods = Array.isArray(s.knighthoods) && s.knighthoods.length > 0;
              return (
                <div key={s.id}>
                  <div
                    style={{ ...styles.subclassChild, ...(isActive ? styles.subclassChildActive : {}) }}
                    onClick={() => goTo('subclasses', s.id)}
                  >
                    <span>{s.name}</span>
                    {s.priority === 'highest' && <span style={styles.pillPriority}>P1</span>}
                    {s.priority === 'second' && <span style={styles.pillPriority}>P2</span>}
                    {s.activeRework && <span style={{ ...styles.pillPriority, background: '#8b6914', color: '#f5ecd9' }}>WIP</span>}
                    {s.narrativeLocked && <span style={{ ...styles.pillPriority, background: '#5c4020', color: '#f5ecd9' }}>DM</span>}
                    {s.narrativeUnique && <span style={{ ...styles.pillPriority, background: '#c9a55c', color: '#3b2615' }}>1/1</span>}
                    {isEmpty && <span style={styles.emptyMarker}>· empty</span>}
                  </div>
                  {hasKnighthoods && isActive && s.knighthoods.map((k) => (
                    <div key={k} style={styles.subclassGrandchild}>{k}</div>
                  ))}
                </div>
              );
            };

            // ── Gensarch gets element subgroupings ────────────────────────────
            const isGensarch = parentClass === 'Gensarch';
            let body = null;
            if (isExpanded) {
              if (isGensarch) {
                const elementOrder = ['Air', 'Earth', 'Fire', 'Water', 'Elamesta'];
                body = elementOrder.map((elem) => {
                  const subs = sortedSubs.filter((s) => s.element === elem);
                  if (subs.length === 0) return null;
                  return (
                    <div key={elem}>
                      <div style={styles.subGroup}>{elem} Gensarch</div>
                      {subs.map(renderSub)}
                    </div>
                  );
                });
              } else {
                body = sortedSubs.map(renderSub);
              }
            }

            return (
              <div key={parentClass}>
                <div
                  style={{
                    ...styles.parentGroup,
                    ...(hasActive ? styles.parentGroupActive : {}),
                  }}
                  onClick={() => toggleClassExpanded(parentClass)}
                >
                  <ChevronRight
                    size={12}
                    style={{
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s',
                    }}
                  />
                  {parentClass}
                  <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#8b6914', fontWeight: 400, fontStyle: 'italic' }}>
                    {sortedSubs.length}
                  </span>
                </div>
                {body}
              </div>
            );
          })}

          <SectionToggle
            label="Characters"
            count={content.characters.length}
            expanded={expandedSections.has('characters')}
            onClick={() => toggleSectionExpanded('characters')}
          />
          {expandedSections.has('characters') && (content.campaignOrder || []).map((campaign) => {
            const charsInCampaign = content.characters.filter((c) => c.campaign === campaign);
            if (charsInCampaign.length === 0) return null;
            const isExpanded = expandedCampaigns.has(campaign);
            const hasActive = section === 'characters' && charsInCampaign.some((c) => c.id === activeId);
            const campaignMeta = content.campaigns?.[campaign] || {};
            const campaignDeceased = campaignMeta.status === 'deceased';

            // Group within campaign by role
            const players = charsInCampaign.filter((c) => c.role === 'player');
            const connected = charsInCampaign.filter((c) => c.role === 'connected');
            const enemies = charsInCampaign.filter((c) => c.role === 'enemy');

            const renderChar = (c) => {
              const isActive = section === 'characters' && activeId === c.id;
              const isEmpty = !c.summary && (!c.keyTraits || c.keyTraits.length === 0);
              return (
                <div
                  key={c.id}
                  style={{ ...styles.subclassChild, ...(isActive ? styles.subclassChildActive : {}) }}
                  onClick={() => goTo('characters', c.id)}
                >
                  <span>{c.name}</span>
                  {c.status === 'deceased' && <span style={{ ...styles.pillPriority, background: '#3b2615', color: '#e8d5a0' }}>†</span>}
                  {c.status === 'freed' && <span style={{ ...styles.pillPriority, background: '#5c8a3a', color: '#f5ecd9' }}>FREED</span>}
                  {c.placeholder && <span style={styles.emptyMarker}>· placeholder</span>}
                  {!c.placeholder && isEmpty && <span style={styles.emptyMarker}>· empty</span>}
                </div>
              );
            };

            const roleHeader = (label) => (
              <div style={{
                padding: '4px 20px 2px 44px',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#8b6914',
                fontWeight: 700,
                fontFamily: '"Cinzel", serif',
                marginTop: '4px',
              }}>{label}</div>
            );

            return (
              <div key={campaign}>
                <div
                  style={{ ...styles.parentGroup, ...(hasActive ? styles.parentGroupActive : {}) }}
                  onClick={() => toggleCampaignExpanded(campaign)}
                >
                  <ChevronRight
                    size={12}
                    style={{
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s',
                    }}
                  />
                  <span>{campaign}</span>
                  {campaignDeceased && <span style={{ ...styles.pillPriority, background: '#3b2615', color: '#e8d5a0', marginLeft: '4px' }}>†</span>}
                  <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#8b6914', fontWeight: 400, fontStyle: 'italic' }}>
                    {charsInCampaign.length}
                  </span>
                </div>
                {isExpanded && (
                  <>
                    {players.length > 0 && roleHeader("Player Characters")}
                    {isExpanded && players.map(renderChar)}
                    {connected.length > 0 && roleHeader("Connected Characters")}
                    {isExpanded && connected.map(renderChar)}
                    {enemies.length > 0 && roleHeader("Enemy Characters")}
                    {isExpanded && enemies.map(renderChar)}
                  </>
                )}
              </div>
            );
          })}
        </aside>

        <main style={styles.main}>
          <div style={styles.mainInner}>
            {searchResults ? (
              <SearchResults results={searchResults} onClick={goTo} query={search} />
            ) : section === 'home' ? (
              <HomePage content={content} goTo={goTo} />
            ) : section === 'campaign' ? (
              <CampaignPage content={content} editMode={editMode} persistChange={persistChange} />
            ) : section === 'races' ? (
              <RacesPage content={content} activeId={activeId} editMode={editMode} persistChange={persistChange} />
            ) : section === 'classes' ? (
              <ClassesPage content={content} activeId={activeId} editMode={editMode} persistChange={persistChange} />
            ) : section === 'subclasses' ? (
              <SubclassesPage content={content} activeId={activeId} editMode={editMode} persistChange={persistChange} />
            ) : section === 'characters' ? (
              <CharactersPage content={content} activeId={activeId} editMode={editMode} persistChange={persistChange} />
            ) : null}
          </div>
        </main>
      </div>

      <div style={{ ...styles.saveStatus, ...(saveStatus ? styles.saveStatusVisible : {}) }}>
        {saveStatus}
      </div>

      {/* DM Password Modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(30,15,5,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: '#f5ecd9', border: '2px solid #8b1414', borderRadius: '6px',
            padding: '32px', width: '360px', boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            fontFamily: '"Palatino Linotype", serif',
          }}>
            <div style={{
              fontFamily: '"Cinzel", serif', fontSize: '16px', fontWeight: 700,
              color: '#5c1414', textTransform: 'uppercase', letterSpacing: '0.1em',
              marginBottom: '8px',
            }}>DM Access Required</div>
            <p style={{ fontSize: '13px', color: '#5c4020', marginBottom: '20px', fontStyle: 'italic' }}>
              Enter the DM password to enable Edit Mode.
            </p>
            <input
              autoFocus
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
              onKeyDown={handlePasswordKeyDown}
              placeholder="Password"
              style={{
                width: '100%', padding: '10px 14px', border: '1px solid #8b6914',
                borderRadius: '4px', fontFamily: 'inherit', fontSize: '14px',
                background: '#fffaf0', color: '#3b2615', marginBottom: '8px',
                outline: 'none',
              }}
            />
            {passwordError && (
              <div style={{ color: '#8b1414', fontSize: '12px', marginBottom: '8px' }}>{passwordError}</div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handlePasswordSubmit}
                style={{
                  flex: 1, padding: '10px', background: '#5c1414', color: '#f5ecd9',
                  border: 'none', borderRadius: '4px', fontFamily: '"Cinzel", serif',
                  fontSize: '13px', fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.08em', cursor: 'pointer',
                }}
              >Unlock</button>
              <button
                onClick={() => { setShowPasswordModal(false); setPasswordInput(''); setPasswordError(''); }}
                style={{
                  padding: '10px 18px', background: 'transparent', color: '#5c4020',
                  border: '1px solid #8b6914', borderRadius: '4px', fontFamily: '"Cinzel", serif',
                  fontSize: '13px', cursor: 'pointer',
                }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTS
// ============================================================
function Header({ content, editMode, onEditToggle, onMetaChange }) {
  return (
    <header style={styles.header}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={styles.title}>{content.meta.title}</h1>
          <div style={styles.subtitle}>{content.meta.subtitle}</div>
        </div>
        <button
          style={editMode ? styles.button : styles.buttonGhost}
          onClick={onEditToggle}
        >
          {editMode ? <><Save size={14} /> Done Editing</> : <><Edit3 size={14} /> Edit Mode</>}
        </button>
      </div>
    </header>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div style={{ ...styles.navItem, ...(active ? styles.navItemActive : {}) }} onClick={onClick}>
      {icon} {label}
    </div>
  );
}

function SectionToggle({ label, count, expanded, onClick }) {
  return (
    <div style={styles.navSectionToggle} onClick={onClick}>
      <ChevronRight
        size={11}
        style={{
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
        }}
      />
      {label}
      <span style={styles.navSectionToggleCount}>{count}</span>
    </div>
  );
}

function HomePage({ content, goTo }) {
  return (
    <div>
      <h1 style={styles.pageHeading}>Welcome</h1>
      <p style={styles.bodyText}>
        This compendium gathers the homebrew material for the <em>{content.meta.title}</em> campaign — custom races, classes, subclasses, characters, and the campaign's overarching narrative.
      </p>
      <p style={styles.bodyText}>
        Use the sidebar to browse by category, or the search bar to find a specific feature, ability, or character. Enable <strong>Edit Mode</strong> from the header to modify content directly — changes save automatically.
      </p>

      <h2 style={styles.sectionHeading}>Quick Reference</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '16px' }}>
        <QuickCard icon={<Sparkles size={20} />} label="Races" count={content.races.filter((r) => r.isParent || !r.parentRace).length} onClick={() => goTo('races', content.races[0]?.id)} />
        <QuickCard icon={<Sword size={20} />} label="Classes" count={content.classes.length} onClick={() => goTo('classes', content.classes[0]?.id)} />
        <QuickCard icon={<Shield size={20} />} label="Subclasses" count={content.subclasses.length} onClick={() => goTo('subclasses', content.subclasses[0]?.id)} />
        <QuickCard icon={<Users size={20} />} label="Characters" count={content.characters.length} onClick={() => goTo('characters', content.characters[0]?.id)} />
      </div>

      <h2 style={styles.sectionHeading}>The Story So Far</h2>
      <p style={{ ...styles.bodyText, whiteSpace: 'pre-wrap' }}>{content.campaign.overview}</p>
    </div>
  );
}

function QuickCard({ icon, label, count, onClick }) {
  return (
    <div style={{ ...styles.card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }} onClick={onClick}>
      <div style={{ color: '#7a1f1f' }}>{icon}</div>
      <div>
        <div style={{ fontFamily: '"Cinzel", serif', fontSize: '16px', color: '#3b2615', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: '13px', color: '#8b6914' }}>{count} {count === 1 ? 'entry' : 'entries'}</div>
      </div>
      <ChevronRight size={16} style={{ marginLeft: 'auto', color: '#8b6914' }} />
    </div>
  );
}

function CampaignPage({ content, editMode, persistChange }) {
  const updateOverview = (val) => {
    persistChange({ ...content, campaign: { ...content.campaign, overview: val } });
  };
  return (
    <div>
      <h1 style={styles.pageHeading}>The Campaign</h1>

      <h2 style={styles.sectionHeading}>Overview</h2>
      {editMode ? (
        <textarea
          style={styles.textarea}
          value={content.campaign.overview}
          onChange={(e) => updateOverview(e.target.value)}
        />
      ) : (
        <p style={{ ...styles.bodyText, whiteSpace: 'pre-wrap' }}>{content.campaign.overview}</p>
      )}

      <h2 style={styles.sectionHeading}>Key Figures</h2>
      {content.campaign.keyFigures.map((f, i) => (
        <div key={i} style={styles.card}>
          <div style={{ ...styles.subHeading, marginTop: 0 }}>{f.name}</div>
          <p style={{ ...styles.bodyText, margin: 0 }}>{f.role}</p>
        </div>
      ))}
    </div>
  );
}

function RacesPage({ content, activeId, editMode, persistChange }) {
  const race = content.races.find((r) => r.id === activeId) || content.races[0];
  if (!race) return <p style={styles.bodyText}>No races defined.</p>;

  const updateRace = (fields) => {
    const updated = content.races.map((r) => r.id === race.id ? { ...r, ...fields } : r);
    persistChange({ ...content, races: updated });
  };
  const updateTrait = (i, fields) => {
    const traits = (race.traits || []).map((t, idx) => idx === i ? { ...t, ...fields } : t);
    updateRace({ traits });
  };
  const addTrait = () => updateRace({ traits: [...(race.traits || []), { name: 'New Trait', text: '' }] });
  const removeTrait = (i) => updateRace({ traits: (race.traits || []).filter((_, idx) => idx !== i) });

  const updateArch = (i, fields) => {
    const archetypes = (race.archetypes || []).map((a, idx) => idx === i ? { ...a, ...fields } : a);
    updateRace({ archetypes });
  };
  const addArch = () => updateRace({ archetypes: [...(race.archetypes || []), { name: 'New Tuning', text: '' }] });
  const removeArch = (i) => updateRace({ archetypes: (race.archetypes || []).filter((_, idx) => idx !== i) });

  const updateSubrace = (subId, fields) => {
    const updated = content.races.map((r) => r.id === subId ? { ...r, ...fields } : r);
    persistChange({ ...content, races: updated });
  };

  const isSubrace = race.parentRace && !race.isParent && race.parentRace !== race.name;
  const isEmpty = !race.description && !race.summary && (!race.traits || race.traits.length === 0);

  const pills = race.pills || raceDefaultPills(race);
  const headings = race.headings || {};

  return (
    <div>
      <EditableHeading as="h1"
        value={race.name}
        defaultValue="Race"
        onChange={(v) => updateRace({ name: v })}
        editMode={editMode}
        style={styles.pageHeading}
      />

      <PillRow pills={pills} editMode={editMode} onChange={(p) => updateRace({ pills: p })} />

      <div style={{ overflow: 'auto' }}>
        <FloatingImage
          media={race.media}
          editMode={editMode}
          onChange={(m) => updateRace({ media: m })}
          category="races"
          entryId={race.id}
        />

        {editMode ? (
          <input value={race.tagline || ''} placeholder="Tagline — one-line flavor…"
            onChange={(e) => updateRace({ tagline: e.target.value })}
            style={{ ...styles.textarea, minHeight: 'unset', padding: '6px 10px', width: '100%', marginBottom: '10px',
              fontStyle: 'italic', fontSize: '15px' }} />
        ) : race.tagline ? (
          <p style={{ ...styles.bodyText, fontStyle: 'italic', color: '#5c4020', fontSize: '16px' }}>{race.tagline}</p>
        ) : null}

        {editMode ? (
          <textarea style={{ ...styles.textarea, minHeight: '120px' }}
            value={isSubrace ? (race.summary || '') : (race.description || '')}
            placeholder={isSubrace ? "Subrace summary…" : "Race description…"}
            onChange={(e) => updateRace(isSubrace ? { summary: e.target.value } : { description: e.target.value })} />
        ) : race.description ? (
          <p style={styles.bodyText}>{race.description}</p>
        ) : race.summary ? (
          <p style={styles.bodyText}>{race.summary}</p>
        ) : isEmpty ? (
          <div style={{ ...styles.card, marginTop: '20px', background: 'rgba(201, 165, 92, 0.15)', borderColor: '#c9a55c' }}>
            <p style={{ ...styles.bodyText, margin: 0, fontStyle: 'italic' }}>
              This entry has not been written yet.
            </p>
          </div>
        ) : null}
      </div>

      <div style={{ clear: 'both' }} />

      <EditableHeading as="h2"
        value={headings.traits}
        defaultValue="Traits"
        onChange={(v) => updateRace({ headings: { ...headings, traits: v } })}
        editMode={editMode}
        style={styles.sectionHeading}
      />
      {(race.traits || []).map((t, i) => (
        <div key={i} style={styles.featureCard}>
          {editMode ? (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <input value={t.name} onChange={(e) => updateTrait(i, { name: e.target.value })}
                placeholder="Trait name"
                style={{ ...styles.textarea, flex: 1, minHeight: 'unset', padding: '4px 8px' }} />
              <button onClick={() => removeTrait(i)}
                style={{ background: '#8b1414', color: '#f5ecd9', border: 'none', borderRadius: '2px',
                  padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>✕</button>
            </div>
          ) : <div style={styles.featureName}>{t.name}</div>}
          {editMode ? (
            <textarea style={{ ...styles.textarea, minHeight: '70px' }} value={t.text || ''}
              placeholder="Trait mechanics…" onChange={(e) => updateTrait(i, { text: e.target.value })} />
          ) : <p style={{ ...styles.bodyText, margin: 0 }}>{t.text}</p>}
        </div>
      ))}
      {editMode && (
        <button onClick={addTrait}
          style={{ ...styles.button, marginTop: '8px', fontSize: '12px', padding: '6px 16px' }}>
          + Add Trait
        </button>
      )}

      {(editMode || (race.archetypes && race.archetypes.length > 0)) && (
        <>
          <EditableHeading as="h2"
            value={headings.archetypes}
            defaultValue="Class Tunings"
            onChange={(v) => updateRace({ headings: { ...headings, archetypes: v } })}
            editMode={editMode}
            style={styles.sectionHeading}
          />
          {(race.archetypes || []).map((a, i) => (
            <div key={i} style={styles.featureCard}>
              {editMode ? (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input value={a.name} onChange={(e) => updateArch(i, { name: e.target.value })}
                    placeholder="Class tuning name"
                    style={{ ...styles.textarea, flex: 1, minHeight: 'unset', padding: '4px 8px' }} />
                  <button onClick={() => removeArch(i)}
                    style={{ background: '#8b1414', color: '#f5ecd9', border: 'none', borderRadius: '2px',
                      padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                </div>
              ) : <div style={styles.featureName}>{a.name}</div>}
              {editMode ? (
                <textarea style={{ ...styles.textarea, minHeight: '70px' }} value={a.text || ''}
                  placeholder="Tuning text…" onChange={(e) => updateArch(i, { text: e.target.value })} />
              ) : <p style={{ ...styles.bodyText, margin: 0 }}>{a.text}</p>}
            </div>
          ))}
          {editMode && (
            <button onClick={addArch}
              style={{ ...styles.button, marginTop: '8px', fontSize: '12px', padding: '6px 16px' }}>
              + Add Class Tuning
            </button>
          )}
        </>
      )}

      {race.isParent && (() => {
        const subraces = content.races
          .filter((r) => r.parentRace === race.parentRace && !r.isParent)
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        if (subraces.length === 0 && !editMode) return null;
        return (
          <>
            <EditableHeading as="h2"
              value={headings.subraces}
              defaultValue="Subraces"
              onChange={(v) => updateRace({ headings: { ...headings, subraces: v } })}
              editMode={editMode}
              style={styles.sectionHeading}
            />
            {subraces.map((sr) => (
              <div key={sr.id} style={styles.featureCard}>
                {editMode ? (
                  <input value={sr.name} onChange={(e) => updateSubrace(sr.id, { name: e.target.value })}
                    placeholder="Subrace name"
                    style={{ ...styles.textarea, minHeight: 'unset', padding: '4px 8px', marginBottom: '6px',
                      fontFamily: '"Cinzel", serif', fontSize: '17px', color: '#3b2615', fontWeight: 700 }} />
                ) : <div style={styles.featureName}>{sr.name}</div>}
                {editMode ? (
                  <textarea style={{ ...styles.textarea, minHeight: '60px' }} value={sr.summary || ''}
                    placeholder="Subrace summary…"
                    onChange={(e) => updateSubrace(sr.id, { summary: e.target.value })} />
                ) : sr.summary ? <p style={{ ...styles.bodyText, margin: 0 }}>{sr.summary}</p>
                  : <p style={{ ...styles.bodyText, margin: 0, fontStyle: 'italic', color: '#8b6914' }}>Not yet written.</p>}
              </div>
            ))}
          </>
        );
      })()}

      <CustomSections
        sections={race.customSections}
        editMode={editMode}
        onChange={(cs) => updateRace({ customSections: cs })}
        headingStyle={styles.sectionHeading}
        category="races"
        entryId={race.id}
      />

      {editMode ? (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '11px', color: '#8b6914', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Source Note</div>
          <textarea style={{ ...styles.textarea, minHeight: '60px' }} value={race.note || ''}
            placeholder="Source notes…" onChange={(e) => updateRace({ note: e.target.value })} />
        </div>
      ) : race.note ? (
        <div style={{ ...styles.card, marginTop: '20px', fontStyle: 'italic', color: '#5c4020' }}>
          <strong>Source note:</strong> {race.note}
        </div>
      ) : null}
    </div>
  );
}

function ClassesPage({ content, activeId, editMode, persistChange }) {
  const cls = content.classes.find((c) => c.id === activeId) || content.classes[0];
  if (!cls) return <p style={styles.bodyText}>No classes defined.</p>;

  const updateCls = (fields) => {
    const updated = content.classes.map((c) => c.id === cls.id ? { ...c, ...fields } : c);
    persistChange({ ...content, classes: updated });
  };
  const updateFeature = (i, fields) => {
    const coreFeatures = (cls.coreFeatures || []).map((f, idx) => idx === i ? { ...f, ...fields } : f);
    updateCls({ coreFeatures });
  };
  const addFeature = () => updateCls({ coreFeatures: [...(cls.coreFeatures || []), { level: 1, name: 'New Feature', text: '' }] });
  const removeFeature = (i) => updateCls({ coreFeatures: (cls.coreFeatures || []).filter((_, idx) => idx !== i) });

  // Table editing
  const updateCol = (i, val) => {
    const cols = [...(cls.tableColumns || ['Level', 'Features'])];
    cols[i] = val;
    updateCls({ tableColumns: cols });
  };
  const addCol = () => {
    const cols = [...(cls.tableColumns || ['Level', 'Features'])];
    cols.splice(cols.length - 1, 0, 'New Column');
    updateCls({ tableColumns: cols });
  };
  const removeCol = (i) => {
    const cols = (cls.tableColumns || []).filter((_, idx) => idx !== i);
    updateCls({ tableColumns: cols });
  };
  const updateRow = (i, fields) => {
    const progression = (cls.progression || []).map((r, idx) => idx === i ? { ...r, ...fields } : r);
    updateCls({ progression });
  };
  const addRow = () => {
    const nextLevel = (cls.progression || []).length + 1;
    updateCls({ progression: [...(cls.progression || []), { level: nextLevel, features: '' }] });
  };
  const removeRow = (i) => updateCls({ progression: (cls.progression || []).filter((_, idx) => idx !== i) });

  const infoField = (label, field, placeholder) => (
    <div style={{ marginBottom: '10px' }}>
      <span style={{ fontSize: '11px', color: '#8b6914', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '3px' }}>{label}</span>
      {editMode
        ? <input value={cls[field] || ''} placeholder={placeholder}
            onChange={(e) => updateCls({ [field]: e.target.value })}
            style={{ ...styles.textarea, minHeight: 'unset', padding: '5px 8px', width: '100%' }} />
        : <span style={{ ...styles.bodyText, display: 'block' }}>{cls[field] || <em style={{ color: '#8b6914', fontSize: '12px' }}>—</em>}</span>
      }
    </div>
  );

  const cols = cls.tableColumns || ['Level', 'Features'];
  const hasProgression = cls.progression && cls.progression.length > 0;
  const pills = cls.pills || classDefaultPills(cls);
  const headings = cls.headings || {};

  return (
    <div>
      <EditableHeading as="h1"
        value={cls.name}
        defaultValue="Class"
        onChange={(v) => updateCls({ name: v })}
        editMode={editMode}
        style={styles.pageHeading}
      />

      <PillRow pills={pills} editMode={editMode} onChange={(p) => updateCls({ pills: p })} />

      <div style={{ overflow: 'auto' }}>
        <FloatingImage
          media={cls.media}
          editMode={editMode}
          onChange={(m) => updateCls({ media: m })}
          category="classes"
          entryId={cls.id}
        />

        {editMode ? (
          <textarea style={{ ...styles.textarea, minHeight: '80px', marginBottom: '16px' }} value={cls.summary || ''}
            placeholder="Class overview…" onChange={(e) => updateCls({ summary: e.target.value })} />
        ) : cls.summary ? (
          <p style={{ ...styles.bodyText, marginBottom: '20px' }}>{cls.summary}</p>
        ) : null}
      </div>

      <div style={{ clear: 'both' }} />

      <EditableHeading as="h2"
        value={headings.startingInfo}
        defaultValue="Hit Points & Starting Info"
        onChange={(v) => updateCls({ headings: { ...headings, startingInfo: v } })}
        editMode={editMode}
        style={styles.sectionHeading}
      />
      <div style={{ ...styles.card, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
        {infoField('Hit Points at 1st Level', 'startingHP', 'e.g. 10 + CON modifier')}
        {infoField('Hit Points per Level', 'hpPerLevel', 'e.g. 6 + CON modifier per level after 1st')}
        {infoField('Armor Training', 'armorTraining', 'e.g. Light Armor, Medium Armor, Shields')}
        {infoField('Saving Throws', 'savingThrows', 'e.g. Strength, Constitution')}
        {infoField('Skill Proficiencies', 'skills', 'e.g. Choose 2 from...')}
        {infoField('Weapon Proficiencies', 'weapons', 'e.g. Simple and Martial Weapons')}
        {infoField('Starting Equipment', 'startingEquipment', 'Starting equipment choices...')}
      </div>

      <EditableHeading as="h2"
        value={headings.classTable}
        defaultValue="Class Table"
        onChange={(v) => updateCls({ headings: { ...headings, classTable: v } })}
        editMode={editMode}
        style={styles.sectionHeading}
      />
      {hasProgression || editMode ? (
        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: '"Palatino Linotype", serif', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#5c1414', color: '#f5ecd9' }}>
                {cols.map((col, i) => (
                  <th key={i} style={{ padding: '8px 12px', textAlign: i === 0 ? 'center' : 'left',
                    fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.06em', fontWeight: 600 }}>
                    {editMode ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input value={col} onChange={(e) => updateCol(i, e.target.value)}
                          style={{ flex: 1, background: 'rgba(255,255,255,0.15)', color: '#f5ecd9',
                            border: '1px solid rgba(255,255,255,0.3)', padding: '2px 6px',
                            fontFamily: '"Cinzel", serif', fontSize: '11px' }} />
                        {cols.length > 2 && (
                          <button onClick={() => removeCol(i)}
                            style={{ background: 'rgba(139,20,20,0.8)', color: '#f5ecd9', border: 'none',
                              borderRadius: '2px', padding: '2px 6px', cursor: 'pointer', fontSize: '10px' }}>✕</button>
                        )}
                      </div>
                    ) : col}
                  </th>
                ))}
                {editMode && (
                  <th style={{ padding: '4px', width: '40px' }}>
                    <button onClick={addCol} title="Add column"
                      style={{ background: 'rgba(255,255,255,0.2)', color: '#f5ecd9', border: 'none',
                        borderRadius: '2px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}>+</button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {(cls.progression || []).map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,250,240,0.8)' : 'rgba(201,165,92,0.15)',
                  borderBottom: '1px solid rgba(139,105,20,0.15)' }}>
                  <td style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 600, color: '#5c1414' }}>
                    {editMode ? (
                      <input type="number" value={row.level || ''} onChange={(e) => updateRow(i, { level: parseInt(e.target.value) || 1 })}
                        style={{ width: '50px', padding: '2px 4px', textAlign: 'center', border: '1px solid #8b6914',
                          background: '#fff8e7', fontFamily: '"Palatino Linotype", serif' }} />
                    ) : row.level}
                  </td>
                  {cols.slice(1, -1).map((_, ci) => {
                    const key = `col${ci + 2}`;
                    return (
                      <td key={ci} style={{ padding: '6px 12px' }}>
                        {editMode ? (
                          <input value={row[key] || ''} onChange={(e) => updateRow(i, { [key]: e.target.value })}
                            style={{ width: '100%', padding: '2px 4px', border: '1px solid #8b6914',
                              background: '#fff8e7', fontFamily: '"Palatino Linotype", serif', fontSize: '13px' }} />
                        ) : (row[key] || '')}
                      </td>
                    );
                  })}
                  <td style={{ padding: '6px 12px', color: '#3b2615' }}>
                    {editMode ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input value={row.features || ''} onChange={(e) => updateRow(i, { features: e.target.value })}
                          style={{ flex: 1, padding: '2px 4px', border: '1px solid #8b6914',
                            background: '#fff8e7', fontFamily: '"Palatino Linotype", serif', fontSize: '13px' }} />
                        <button onClick={() => removeRow(i)}
                          style={{ background: '#8b1414', color: '#f5ecd9', border: 'none', borderRadius: '2px',
                            padding: '2px 6px', cursor: 'pointer', fontSize: '10px' }}>✕</button>
                      </div>
                    ) : row.features}
                  </td>
                  {editMode && <td></td>}
                </tr>
              ))}
            </tbody>
          </table>
          {editMode && (
            <button onClick={addRow}
              style={{ ...styles.button, marginTop: '6px', fontSize: '12px', padding: '6px 16px' }}>
              + Add Row
            </button>
          )}
        </div>
      ) : (
        <div style={{ ...styles.card, background: 'rgba(201, 165, 92, 0.15)', borderColor: '#c9a55c', marginBottom: '20px' }}>
          <p style={{ ...styles.bodyText, margin: 0, fontStyle: 'italic' }}>Class table not yet filled in.</p>
        </div>
      )}

      <EditableHeading as="h2"
        value={headings.coreFeatures}
        defaultValue="Core Features"
        onChange={(v) => updateCls({ headings: { ...headings, coreFeatures: v } })}
        editMode={editMode}
        style={styles.sectionHeading}
      />
      {(cls.coreFeatures || []).map((f, i) => (
        <div key={i} style={styles.featureCard}>
          {editMode ? (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#8b6914' }}>Lvl</span>
              <input type="number" value={f.level} onChange={(e) => updateFeature(i, { level: parseInt(e.target.value) || 1 })}
                style={{ ...styles.textarea, width: '60px', minHeight: 'unset', padding: '4px 8px' }} />
              <input value={f.name} onChange={(e) => updateFeature(i, { name: e.target.value })}
                placeholder="Feature name"
                style={{ ...styles.textarea, flex: 1, minHeight: 'unset', padding: '4px 8px' }} />
              <button onClick={() => removeFeature(i)}
                style={{ background: '#8b1414', color: '#f5ecd9', border: 'none', borderRadius: '2px',
                  padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>✕</button>
            </div>
          ) : <>
            <div style={styles.featureLevel}>Level {f.level}</div>
            <div style={styles.featureName}>{f.name}</div>
          </>}
          {editMode ? (
            <textarea style={{ ...styles.textarea, minHeight: '80px' }} value={f.text || ''}
              placeholder="Feature mechanics…" onChange={(e) => updateFeature(i, { text: e.target.value })} />
          ) : <p style={{ ...styles.bodyText, margin: 0 }}>{f.text}</p>}
        </div>
      ))}
      {(cls.coreFeatures || []).length === 0 && !editMode && (
        <div style={{ ...styles.card, background: 'rgba(201, 165, 92, 0.15)', borderColor: '#c9a55c' }}>
          <p style={{ ...styles.bodyText, margin: 0, fontStyle: 'italic' }}>No features written yet.</p>
        </div>
      )}
      {editMode && (
        <button onClick={addFeature}
          style={{ ...styles.button, marginTop: '8px', fontSize: '12px', padding: '6px 16px' }}>
          + Add Feature
        </button>
      )}

      <CustomSections
        sections={cls.customSections}
        editMode={editMode}
        onChange={(cs) => updateCls({ customSections: cs })}
        headingStyle={styles.sectionHeading}
        category="classes"
        entryId={cls.id}
      />

      {editMode ? (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '11px', color: '#8b6914', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Note</div>
          <textarea style={{ ...styles.textarea, minHeight: '60px' }} value={cls.notes || ''}
            placeholder="Class notes…" onChange={(e) => updateCls({ notes: e.target.value })} />
        </div>
      ) : cls.notes ? (
        <div style={{ ...styles.card, marginTop: '20px', fontStyle: 'italic', color: '#5c4020' }}>
          <strong>Note:</strong> {cls.notes}
        </div>
      ) : null}
    </div>
  );
}

function SubclassesPage({ content, activeId, editMode, persistChange }) {
  const sub = content.subclasses.find((s) => s.id === activeId) || content.subclasses[0];
  if (!sub) return <p style={styles.bodyText}>No subclasses defined.</p>;

  const isEmpty = !sub.summary && (!sub.features || sub.features.length === 0);

  const updateSub = (fields) => {
    const updated = content.subclasses.map((s) => s.id === sub.id ? { ...s, ...fields } : s);
    persistChange({ ...content, subclasses: updated });
  };

  const updateFeature = (i, fields) => {
    const features = sub.features.map((f, idx) => idx === i ? { ...f, ...fields } : f);
    updateSub({ features });
  };

  const addFeature = () => {
    const features = [...(sub.features || []), { level: 3, name: 'New Feature', text: '' }];
    updateSub({ features });
  };

  const removeFeature = (i) => {
    const features = sub.features.filter((_, idx) => idx !== i);
    updateSub({ features });
  };

  const pills = sub.pills || subclassDefaultPills(sub);
  const headings = sub.headings || {};

  return (
    <div>
      <EditableHeading as="h1"
        value={sub.name}
        defaultValue="Subclass"
        onChange={(v) => updateSub({ name: v })}
        editMode={editMode}
        style={styles.pageHeading}
      />

      <PillRow pills={pills} editMode={editMode} onChange={(p) => updateSub({ pills: p })} />

      <div style={{ overflow: 'auto' }}>
        <FloatingImage
          media={sub.media}
          editMode={editMode}
          onChange={(m) => updateSub({ media: m })}
          category="subclasses"
          entryId={sub.id}
        />

        {editMode ? (
          <textarea style={styles.textarea} placeholder="Summary…" value={sub.summary || ''}
            onChange={(e) => updateSub({ summary: e.target.value })} />
        ) : sub.summary ? (
          <p style={styles.bodyText}>{sub.summary}</p>
        ) : isEmpty ? (
          <div style={{ ...styles.card, marginTop: '20px', background: 'rgba(201, 165, 92, 0.15)', borderColor: '#c9a55c' }}>
            <p style={{ ...styles.bodyText, margin: 0, fontStyle: 'italic' }}>
              This entry has not been written yet. Source material exists in the homebrew documents — content will be drafted in a future pass.
            </p>
          </div>
        ) : null}
      </div>

      <div style={{ clear: 'both' }} />

      <EditableHeading as="h2"
        value={headings.features}
        defaultValue="Features"
        onChange={(v) => updateSub({ headings: { ...headings, features: v } })}
        editMode={editMode}
        style={styles.sectionHeading}
      />
      {(sub.features || []).map((f, i) => (
        <div key={i} style={{ ...styles.featureCard, position: 'relative' }}>
          {editMode && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#8b6914' }}>Lvl</span>
              <input type="number" value={f.level} onChange={(e) => updateFeature(i, { level: parseInt(e.target.value) || 1 })}
                style={{ ...styles.textarea, width: '60px', minHeight: 'unset', padding: '4px 8px' }} />
              <input value={f.name} onChange={(e) => updateFeature(i, { name: e.target.value })}
                placeholder="Feature name" style={{ ...styles.textarea, flex: 1, minHeight: 'unset', padding: '4px 8px' }} />
              <button onClick={() => removeFeature(i)}
                style={{ background: '#8b1414', color: '#f5ecd9', border: 'none', borderRadius: '2px',
                  padding: '4px 8px', cursor: 'pointer', fontSize: '11px', fontFamily: '"Cinzel", serif' }}>✕</button>
            </div>
          )}
          {!editMode && <>
            <div style={styles.featureLevel}>Level {f.level}</div>
            <div style={styles.featureName}>{f.name}</div>
          </>}
          {editMode ? (
            <textarea style={{ ...styles.textarea, minHeight: '80px' }} value={f.text || ''}
              placeholder="Feature mechanics…"
              onChange={(e) => updateFeature(i, { text: e.target.value })} />
          ) : (
            <p style={{ ...styles.bodyText, margin: 0 }}>{f.text}</p>
          )}
        </div>
      ))}
      {editMode && (
        <button onClick={addFeature}
          style={{ ...styles.button, marginTop: '10px', fontSize: '12px', padding: '6px 16px' }}>
          + Add Feature
        </button>
      )}

      <CustomSections
        sections={sub.customSections}
        editMode={editMode}
        onChange={(cs) => updateSub({ customSections: cs })}
        headingStyle={styles.sectionHeading}
        category="subclasses"
        entryId={sub.id}
      />

      {editMode ? (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '11px', color: '#8b6914', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Source Note</div>
          <textarea style={{ ...styles.textarea, minHeight: '60px' }} value={sub.note || ''}
            placeholder="Source notes, flags, DM rulings…"
            onChange={(e) => updateSub({ note: e.target.value })} />
        </div>
      ) : sub.note ? (
        <div style={{ ...styles.card, marginTop: '20px', fontStyle: 'italic', color: '#5c4020' }}>
          <strong>Source note:</strong> {sub.note}
        </div>
      ) : null}
    </div>
  );
}

function CharactersPage({ content, activeId, editMode, persistChange }) {
  const ch = content.characters.find((c) => c.id === activeId) || content.characters[0];
  if (!ch) return <p style={styles.bodyText}>No characters defined.</p>;

  const isEmpty = !ch.summary && (!ch.keyTraits || ch.keyTraits.length === 0);

  const updateCh = (fields) => {
    const updated = content.characters.map((c) => c.id === ch.id ? { ...c, ...fields } : c);
    persistChange({ ...content, characters: updated });
  };

  const updateTrait = (i, val) => {
    const keyTraits = (ch.keyTraits || []).map((t, idx) => idx === i ? val : t);
    updateCh({ keyTraits });
  };

  const addTrait = () => updateCh({ keyTraits: [...(ch.keyTraits || []), ''] });
  const removeTrait = (i) => updateCh({ keyTraits: (ch.keyTraits || []).filter((_, idx) => idx !== i) });

  const fieldRow = (label, field, placeholder, multiline = false) => (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', color: '#8b6914', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      {multiline ? (
        <textarea style={{ ...styles.textarea, minHeight: '100px' }} value={ch[field] || ''}
          placeholder={placeholder} onChange={(e) => updateCh({ [field]: e.target.value })} />
      ) : (
        <input value={ch[field] || ''} placeholder={placeholder}
          onChange={(e) => updateCh({ [field]: e.target.value })}
          style={{ ...styles.textarea, minHeight: 'unset', padding: '6px 10px', width: '100%' }} />
      )}
    </div>
  );

  const pills = ch.pills || characterDefaultPills(ch);
  const headings = ch.headings || {};

  return (
    <div>
      <EditableHeading as="h1"
        value={ch.name}
        defaultValue="Character"
        onChange={(v) => updateCh({ name: v })}
        editMode={editMode}
        style={styles.pageHeading}
      />

      <PillRow pills={pills} editMode={editMode} onChange={(p) => updateCh({ pills: p })} />

      <div style={{ overflow: 'auto' }}>
        <FloatingImage
          media={ch.media}
          editMode={editMode}
          onChange={(m) => updateCh({ media: m })}
          category="characters"
          entryId={ch.id}
        />

        {editMode ? (
          <div style={{ ...styles.card, marginBottom: '20px' }}>
            <div style={{ fontFamily: '"Cinzel", serif', fontSize: '12px', color: '#5c1414', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid rgba(139,105,20,0.3)' }}>Identity</div>
            {fieldRow('Race', 'race', 'Race or species…')}
            {fieldRow('Class & Level', 'class', 'e.g. Paladin 5 / Esper 6 (Oath of Renewal)…')}
            {fieldRow('Patron', 'patron', 'Deity, patron, or —')}
          </div>
        ) : (ch.race || ch.class || (ch.patron && ch.patron !== '—' && ch.patron !== '')) ? (
          <div style={{ marginBottom: '14px' }}>
            {ch.race && <span style={styles.pill}>{ch.race}</span>}
            {ch.class && <span style={styles.pill}>{ch.class}</span>}
            {ch.patron && ch.patron !== '—' && ch.patron !== '' && <span style={styles.pill}>Patron: {ch.patron}</span>}
          </div>
        ) : null}

        {ch.placeholder && (
          <div style={{ ...styles.card, marginTop: '12px', background: 'rgba(201, 165, 92, 0.15)', borderColor: '#c9a55c' }}>
            <p style={{ ...styles.bodyText, margin: 0, fontStyle: 'italic' }}>
              <strong>Placeholder.</strong> Name and details to be filled in.
            </p>
          </div>
        )}

        {editMode ? (
          fieldRow('Summary', 'summary', 'Character summary — who they are, what drives them, their place in the campaign…', true)
        ) : ch.summary ? (
          <p style={styles.bodyText}>{ch.summary}</p>
        ) : !ch.placeholder && isEmpty ? (
          <div style={{ ...styles.card, marginTop: '20px', background: 'rgba(201, 165, 92, 0.15)', borderColor: '#c9a55c' }}>
            <p style={{ ...styles.bodyText, margin: 0, fontStyle: 'italic' }}>No details written yet.</p>
          </div>
        ) : null}
      </div>

      <div style={{ clear: 'both' }} />

      <EditableHeading as="h2"
        value={headings.keyTraits}
        defaultValue="Key Traits"
        onChange={(v) => updateCh({ headings: { ...headings, keyTraits: v } })}
        editMode={editMode}
        style={styles.sectionHeading}
      />
      {(ch.keyTraits || []).map((t, i) => (
        <div key={i} style={{ ...styles.featureCard, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          {editMode ? (
            <>
              <input value={t} onChange={(e) => updateTrait(i, e.target.value)}
                placeholder="Key trait…"
                style={{ ...styles.textarea, flex: 1, minHeight: 'unset', padding: '6px 10px' }} />
              <button onClick={() => removeTrait(i)}
                style={{ background: '#8b1414', color: '#f5ecd9', border: 'none', borderRadius: '2px',
                  padding: '4px 8px', cursor: 'pointer', fontSize: '11px', flexShrink: 0 }}>✕</button>
            </>
          ) : (
            <p style={{ ...styles.bodyText, margin: 0 }}>{t}</p>
          )}
        </div>
      ))}
      {editMode && (
        <button onClick={addTrait}
          style={{ ...styles.button, marginTop: '8px', fontSize: '12px', padding: '6px 16px' }}>
          + Add Trait
        </button>
      )}

      <CustomSections
        sections={ch.customSections}
        editMode={editMode}
        onChange={(cs) => updateCh({ customSections: cs })}
        headingStyle={styles.sectionHeading}
        category="characters"
        entryId={ch.id}
      />

      {editMode ? (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '11px', color: '#8b6914', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Source Note</div>
          <textarea style={{ ...styles.textarea, minHeight: '60px' }} value={ch.note || ''}
            placeholder="Campaign notes, cross-references, open questions…"
            onChange={(e) => updateCh({ note: e.target.value })} />
        </div>
      ) : ch.note ? (
        <div style={{ ...styles.card, marginTop: '20px', fontStyle: 'italic', color: '#5c4020' }}>
          <strong>Source note:</strong> {ch.note}
        </div>
      ) : null}
    </div>
  );
}

function SearchResults({ results, onClick, query }) {
  return (
    <div>
      <h1 style={styles.pageHeading}>Search: "{query}"</h1>
      {results.length === 0 ? (
        <p style={styles.bodyText}>Nothing found in the tome.</p>
      ) : (
        results.map((r, i) => (
          <div
            key={i}
            style={{ ...styles.card, cursor: 'pointer' }}
            onClick={() => onClick(r.section, r.id)}
          >
            <span style={styles.pill}>{r.type}</span>
            <strong style={{ fontFamily: '"Cinzel", serif', color: '#3b2615' }}>{r.name}</strong>
            {r.parent && <span style={{ color: '#8b6914', fontSize: '13px', marginLeft: '8px' }}>({r.parent})</span>}
          </div>
        ))
      )}
    </div>
  );
}
