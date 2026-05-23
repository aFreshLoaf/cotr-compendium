import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { loadFromSupabase, saveToSupabase, subscribeToUpdates, isDMAuthenticated, authenticateDM, clearDMSession } from './storage.js';
import { Search, Book, Users, Sword, Shield, Sparkles, ScrollText, Edit3, Plus, X, Save, ChevronRight, Home, Skull, Eye, Trash2 } from 'lucide-react';

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
    "Conduit of Life (C.O.L.)",
    "Varnok", "Echoborn", "LyCara", "Vekkens", "Solari", "Heldums",
    "Asarin", "Raka", "Malakar", "Tauren", "Dracolytes", "Dhampir", "Crocothians",
    "Salamandras", "Gildra'Tené", "Tasuma", "Storden",
    "Thornara", "Onikara", "Heiralis", "Venira", "Mournir", "Aerothel",
    "Kyith'Kin", "Crivans", "Astravori", "Littorins", "Oro'Kong",
  ],
  races: [
    // ============ CONDUIT OF LIFE (custom — not in races doc) ============
    {
      id: "col",
      name: "Conduit of Life (C.O.L.)",
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
    {
      id: "esper",
      name: "Esper",
      primary: "Intelligence",
      hitDie: "d6",
      summary: "The formidable minds of Espers manifest in psionic abilities — surreal yet beautiful, subtle but deadly. Innately influential to Alptorum, the dimension of mind, Espers are both subject to and sovereign over powers and truths inconceivable to common folk. Their unknowable powers can be harnessed in unpredictable and creative ways.",
      proficiencies: {
        savingThrows: "Intelligence, Wisdom",
        skills: "Choose 2: Sleight of Hand, Stealth, Psionics, History, Insight, Persuasion",
        weapons: "Simple Weapons",
        armor: "Light Armor",
      },
      coreFeatures: [
        { level: 1, name: "Psionic Ability", text: "ESP Dice scale (1d6 → 1d8 at 5th → 1d10 at 11th → 1d12 at 17th). Thought Points = Esper level, regained on long rest; bonus action to regain 1 (recharges on short/long rest). ESP Save DC = 8 + PB + INT mod. Eyes emit telling purple light when using psionics." },
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
        { level: 1, talents: "—", tp: 1, espDie: "d6", features: "Psionic Ability, Extrasensory Perception" },
        { level: 2, talents: 2, tp: 2, espDie: "d6", features: "Supersensory Stimulus, Preternatural Talents" },
        { level: 3, talents: 3, tp: 3, espDie: "d6", features: "Esper Sect" },
        { level: 4, talents: 3, tp: 4, espDie: "d6", features: "ASI, Repulse Reality" },
        { level: 5, talents: 4, tp: 5, espDie: "d8", features: "Contemplation, Extrasensory Improvement" },
        { level: 6, talents: 4, tp: 6, espDie: "d8", features: "Sect Feature" },
        { level: 7, talents: 5, tp: 7, espDie: "d8", features: "Mental Pavise" },
        { level: 8, talents: 5, tp: 8, espDie: "d8", features: "ASI" },
        { level: 9, talents: 6, tp: 9, espDie: "d8", features: "Supersensory Improvement" },
        { level: 10, talents: 6, tp: 10, espDie: "d8", features: "Sect Feature" },
        { level: 11, talents: 7, tp: 11, espDie: "d10", features: "Total Acumen" },
        { level: 12, talents: 7, tp: 12, espDie: "d10", features: "ASI" },
        { level: 13, talents: 8, tp: 13, espDie: "d10", features: "Extrasensory Mastery" },
        { level: 14, talents: 8, tp: 14, espDie: "d10", features: "Sect Feature, True Cryptaesthesia" },
        { level: 15, talents: 9, tp: 15, espDie: "d10", features: "Immutable" },
        { level: 16, talents: 9, tp: 16, espDie: "d10", features: "ASI" },
        { level: 17, talents: 10, tp: 17, espDie: "d12", features: "—" },
        { level: 18, talents: 10, tp: 18, espDie: "d12", features: "Sect Feature, Supersensory Mastery" },
        { level: 19, talents: 11, tp: 19, espDie: "d12", features: "Epic Boon, As Within So Without" },
        { level: 20, talents: 11, tp: 20, espDie: "d12", features: "Consummate Mind" },
      ],
    },
    {
      id: "ranger",
      name: "Ranger (CotR Rewrite)",
      primary: "Dexterity / Wisdom",
      hitDie: "d10",
      summary: "The Chronicles of the Realms Ranger is a comprehensive rewrite balancing the class as a top-tier martial-magical hybrid. Notable additions include Apex Dread (6th), upgraded Apex Dread (13th), reworked Tenacity (17th), and expanded Prowess (18th) with truesight-on-mark. The Patience mechanic is balanced around its action cost combined with repositioning benefit and charge-stacking — removing any element breaks the balance.",
      proficiencies: {
        savingThrows: "Strength, Dexterity",
        skills: "See full Ranger doc",
        weapons: "Simple and Martial",
        armor: "Light, Medium, Shields",
      },
      coreFeatures: [
        { level: 1, name: "Favored Enemy / Marksmanship", text: "See full Ranger document for current 5.5e CotR feature list." },
        { level: 6, name: "Apex Dread", text: "New mid-tier feature filling the previous level-6 dead zone — strikes fear into marked targets." },
        { level: 13, name: "Apex Dread (Upgraded)", text: "Upgraded form of Apex Dread." },
        { level: 17, name: "Tenacity (Reworked)", text: "Reworked endurance feature." },
        { level: 18, name: "Prowess (Expanded)", text: "Expanded with truesight against marked targets." },
      ],
      notes: "Full feature list lives in COTR_Ranger_Final.docx. The compendium will be expanded with the complete table as edits are made.",
    },
  ],
  // Define the canonical ordering of parent classes for the sidebar grouping
  parentClassOrder: [
    "Artificer", "Barbarian", "Bard", "Cleric", "Druid", "Eidolon", "Esper",
    "Fighter", "Gensarch", "Mecha", "Monk", "Paladin", "Ranger", "Rogue",
    "Sorcerer", "TeliKin", "Warlock", "Wizard"
  ],
  subclasses: [
    // ============ ARTIFICER ============
    { id: "primordial-bladeweaver", name: "Primordial Bladeweaver", parentClass: "Artificer", priority: "highest", summary: "", features: [], note: "" },
    { id: "armorwright", name: "The Armorwright", parentClass: "Artificer", summary: "", features: [], note: "" },
    { id: "elementalist-savant", name: "Elementalist Savant", parentClass: "Artificer", summary: "", features: [], note: "" },
    { id: "godslayer-artificer", name: "Godslayer", parentClass: "Artificer", summary: "", features: [], note: "" },

    // ============ BARBARIAN ============
    { id: "war-ravager", name: "War Ravager", parentClass: "Barbarian", priority: "highest", summary: "", features: [], note: "" },
    { id: "path-of-tarasque", name: "Path of the Tarasque", parentClass: "Barbarian", priority: "second", summary: "", features: [], note: "" },
    { id: "path-of-godslayer", name: "Path of the Godslayer", parentClass: "Barbarian", summary: "", features: [], note: "" },
    { id: "path-of-godhood", name: "Path of Godhood", parentClass: "Barbarian", summary: "", features: [], note: "" },
    { id: "path-of-drunk", name: "Path of the Drunk", parentClass: "Barbarian", summary: "", features: [], note: "" },
    { id: "path-of-ravager", name: "Path of the Ravager", parentClass: "Barbarian", summary: "", features: [], note: "" },
    { id: "path-of-umber-hulk", name: "Path of the Umber Hulk", parentClass: "Barbarian", summary: "", features: [], note: "" },

    // ============ BARD ============
    { id: "college-of-godslaying", name: "College of Godslaying", parentClass: "Bard", summary: "", features: [], note: "" },
    { id: "college-of-arcane-marksman", name: "College of the Arcane Marksman", parentClass: "Bard", summary: "", features: [], note: "" },
    { id: "college-of-sun", name: "College of the Sun", parentClass: "Bard", summary: "", features: [], note: "" },
    { id: "college-of-siren", name: "College of the Siren", parentClass: "Bard", summary: "", features: [], note: "" },
    { id: "college-of-souls", name: "College of Souls", parentClass: "Bard", summary: "", features: [], note: "" },

    // ============ CLERIC ============
    { id: "domain-of-godslaying", name: "Domain of Godslaying", parentClass: "Cleric", summary: "", features: [], note: "" },
    { id: "domain-of-archangels", name: "Domain of Archangels", parentClass: "Cleric", summary: "", features: [], note: "" },
    { id: "domain-of-platinum-dragon", name: "Domain of the Platinum Dragon", parentClass: "Cleric", summary: "", features: [], note: "Bahamut-themed domain. Includes Bahamut's Protection feature." },
    { id: "might-domain", name: "Might Domain", parentClass: "Cleric", summary: "", features: [], note: "" },

    // ============ DRUID ============
    { id: "circle-of-defiance", name: "Circle of Defiance", parentClass: "Druid", summary: "", features: [], note: "" },
    { id: "circle-of-dragons", name: "Circle of Dragons", parentClass: "Druid", summary: "", features: [], note: "" },
    { id: "circle-of-fey", name: "Circle of the Fey", parentClass: "Druid", summary: "", features: [], note: "" },
    { id: "circle-of-poison", name: "Circle of Poison", parentClass: "Druid", summary: "", features: [], note: "" },

    // ============ EIDOLON ============
    { id: "eidolon-invoker", name: "Invoker", parentClass: "Eidolon", summary: "", features: [], note: "" },
    { id: "eidolon-warrior", name: "Warrior", parentClass: "Eidolon", summary: "", features: [], note: "" },

    // ============ ESPER ============
    { id: "psionic-executioner", name: "Psionic Executioner", parentClass: "Esper", summary: "A duelist who slows targets and locks minds, finishing them with overwhelming psychic precision.", features: [
      { level: 3, name: "Executioner's Arc", text: "Action, 1 ESP die: 15-ft cone, DEX save. Fail: ESP die + INT mod psychic damage, speed reduced 10 ft until end of next turn. Success: half, no slow." },
      { level: 3, name: "Mind Lock", text: "Initiate a contested mental duel with a target. (See full doc.)" },
      { level: 5, name: "Mind Spike Cleave", text: "On melee hit, 1 ESP die: INT save. Fail: dazed until start of your next turn. Disadvantage if already in Mind Lock." },
      { level: 7, name: "Psionic Pulse Slash", text: "Action, 2 ESP dice: 30-ft line. CON save. Fail: dice + INT mod psychic damage, knocked prone." },
      { level: 9, name: "Mental Rupture Step", text: "Move 10+ ft in a line then hit: 1 ESP die — WIS save. Fail: 1d6 INT damage and disadvantage on INT saves for 1 min." },
      { level: 11, name: "Crushing Duelist's Will", text: "While in Mind Lock, start of turn, 1 ESP die: add die to INT contest; deal INT mod psychic damage regardless." },
      { level: 13, name: "Echo of the Guillotine", text: "When you drop a creature with melee, 1 ESP die: another within 15 ft makes CHA save or frightened + ESP die damage." },
      { level: 15, name: "Paralyzing Execution", text: "On crit or kill with melee: use Paralyzing Stare free." },
    ], note: "Full Mind Lock subsystem, victory effects, and Broken Resistance rider in Psionic_Executioner_v2.docx." },
    { id: "deity-nightmare", name: "Deity Nightmare", parentClass: "Esper", summary: "", features: [], note: "" },
    { id: "eye-of-eternity", name: "Eye of Eternity", parentClass: "Esper", summary: "", features: [], note: "" },
    { id: "order-of-mender", name: "Order of the Mender", parentClass: "Esper", summary: "", features: [], note: "" },
    { id: "mind-ravager", name: "Mind Ravager", parentClass: "Esper", summary: "", features: [], note: "" },
    { id: "hidden-hand", name: "The Hidden Hand", parentClass: "Esper", summary: "", features: [], note: "" },
    { id: "god-eater", name: "God Eater", parentClass: "Esper", summary: "", features: [], note: "" },

    // ============ FIGHTER ============
    { id: "mortal-guardian", name: "The Mortal Guardian", parentClass: "Fighter", summary: "", features: [], note: "" },
    { id: "gravitorian", name: "Gravitorian", parentClass: "Fighter", priority: "second", summary: "", features: [], note: "" },
    { id: "blood-knight", name: "Blood Knight", parentClass: "Fighter", summary: "", features: [], note: "" },
    { id: "valkyrie", name: "Valkyrie", parentClass: "Fighter", summary: "", features: [], note: "Only female characters can use this subclass." },
    { id: "dragon-knight", name: "Dragon Knight", parentClass: "Fighter", summary: "", features: [], note: "Single subclass with six Knighthood variants chosen at 3rd level: Inferno (Red — Fire), Tempest (Blue — Lightning), Verglas (White — Cold), Elixir (Green — Poison), Decay (Black — Acid), Encephalon (Purple — Psychic). The Knighthood determines damage type and shapes all subsequent features." },

    // ============ GENSARCH ============
    { id: "air-gensarch", name: "Air", parentClass: "Gensarch", summary: "", features: [], note: "" },
    { id: "earth-gensarch", name: "Earth", parentClass: "Gensarch", summary: "", features: [], note: "" },
    { id: "fire-gensarch", name: "Fire", parentClass: "Gensarch", summary: "", features: [], note: "" },
    { id: "water-gensarch", name: "Water", parentClass: "Gensarch", summary: "", features: [], note: "" },
    { id: "elamesta", name: "Elamesta", parentClass: "Gensarch", summary: "", features: [], note: "" },

    // ============ MECHA ============
    // (slot ready)

    // ============ MONK ============
    { id: "way-of-divine-bane", name: "Way of Divine Bane", parentClass: "Monk", summary: "", features: [], note: "" },
    { id: "way-of-graceful-warrior", name: "Way of the Graceful Warrior", parentClass: "Monk", summary: "", features: [], note: "" },
    { id: "way-of-inner-rage", name: "Way of the Inner Rage", parentClass: "Monk", summary: "", features: [], note: "" },
    { id: "way-of-oni", name: "Way of the Oni", parentClass: "Monk", summary: "", features: [], note: "" },
    { id: "way-of-tempest", name: "Way of the Tempest", parentClass: "Monk", summary: "", features: [], note: "" },
    { id: "way-of-flaming-soul", name: "Way of the Flaming Soul", parentClass: "Monk", summary: "", features: [], note: "" },

    // ============ PALADIN ============
    { id: "oath-of-soul-destruction", name: "Oath of Soul Destruction", parentClass: "Paladin", priority: "highest", summary: "", features: [], note: "" },
    { id: "oath-of-godslayer", name: "Oath of the Godslayer", parentClass: "Paladin", summary: "", features: [], note: "" },
    { id: "oath-of-arcane", name: "Oath of the Arcane", parentClass: "Paladin", priority: "second", summary: "", features: [], note: "" },
    { id: "oath-of-renewal", name: "Oath of Renewal", parentClass: "Paladin", summary: "Paladins of Renewal serve dawn deities like Lathander. NEXUS's oath. Focuses on healing, redemption, and reclaiming the lost.", features: [
      { level: 3, name: "Tenets of Renewal", text: "Bring light to the fallen. Offer the chance to return. Strike only when redemption is refused." },
    ], note: "Full subclass text in Oath_of_Renewal.txt — to be expanded." },
    { id: "oath-of-necrosis", name: "Oath of Necrosis", parentClass: "Paladin", summary: "", features: [], note: "" },

    // ============ RANGER ============
    { id: "head-hunter", name: "Head Hunter", parentClass: "Ranger", priority: "highest", summary: "", features: [], note: "" },
    { id: "shadowy-arrow", name: "The Shadowy Arrow", parentClass: "Ranger", summary: "Glass of Dusk's subclass. Shadow-touched marksmanship. Mark targets through darkness, weave shadow into ammunition.", features: [
      { level: 3, name: "Shadowmark", text: "Mark a target in dim light or darkness — see subclass doc for full mechanics." },
    ], note: "Full subclass text in The_Shadowy_Arrow.txt — to be expanded." },
    { id: "deity-hunter", name: "Deity Hunter", parentClass: "Ranger", summary: "", features: [], note: "" },
    { id: "venomous-hunter", name: "Venomous Hunter", parentClass: "Ranger", summary: "", features: [], note: "" },

    // ============ ROGUE ============
    { id: "surgeon-of-shadows", name: "Surgeon of Shadows", parentClass: "Rogue", priority: "highest", summary: "", features: [], note: "" },
    { id: "reaper-of-souls", name: "Reaper of Souls", parentClass: "Rogue", priority: "second", summary: "", features: [], note: "" },
    { id: "divine-slayer", name: "Divine Slayer", parentClass: "Rogue", summary: "", features: [], note: "Listed in the subclasses reference doc as 'Archetype of the God Slayer.'" },
    { id: "shinobi-blade", name: "The Shinobi's Blade", parentClass: "Rogue", summary: "", features: [], note: "" },
    { id: "the-vanir", name: "The Vanir", parentClass: "Rogue", summary: "", features: [], note: "" },

    // ============ SORCERER ============
    { id: "divine-wrath", name: "Divine Wrath Origin", parentClass: "Sorcerer", summary: "", features: [], note: "" },
    { id: "death-knights-curse", name: "Death Knight's Curse", parentClass: "Sorcerer", summary: "", features: [], note: "" },
    { id: "lichs-curse", name: "The Lich's Curse", parentClass: "Sorcerer", summary: "", features: [], note: "" },
    { id: "voidborn", name: "Voidborn", parentClass: "Sorcerer", summary: "", features: [], note: "" },

    // ============ TELIKIN ============
    { id: "void-guardian", name: "Void Guardian", parentClass: "TeliKin", summary: "", features: [], note: "" },
    { id: "void-striker", name: "The Void Striker", parentClass: "TeliKin", summary: "", features: [], note: "" },
    { id: "void-clasher", name: "Void Clasher", parentClass: "TeliKin", summary: "", features: [], note: "" },
    { id: "telikin-of-vigilance", name: "Vigilance", parentClass: "TeliKin", summary: "", features: [], note: "Listed in the subclasses reference doc as 'TeliKin of Vigilance.'" },

    // ============ WARLOCK ============
    { id: "pact-of-godslayer", name: "Pact of the Godslayer", parentClass: "Warlock", summary: "", features: [], note: "" },
    { id: "pact-of-vampirism", name: "Pact of Vampirism", parentClass: "Warlock", summary: "", features: [], note: "" },
    { id: "pact-of-evalune", name: "Pact of the Evalune", parentClass: "Warlock", summary: "", features: [], note: "" },
    { id: "infernal-summoner", name: "Infernal Summoner", parentClass: "Warlock", summary: "", features: [], note: "NEEDS CLARIFICATION: This entry was carried over from earlier compendium drafts but was not found in the subclasses reference doc. Mikey believes this may be Abel's unique class rather than a standard Warlock subclass — confirm and recategorize if needed." },

    // ============ WIZARD ============
    { id: "school-of-desecration", name: "School of Desecration", parentClass: "Wizard", summary: "", features: [], note: "" },
    { id: "school-of-vacuus", name: "School of Vacuus", parentClass: "Wizard", summary: "", features: [], note: "" },
    { id: "bladebinder", name: "Bladebinder", parentClass: "Wizard", summary: "", features: [], note: "Originally a Wizard subclass; may be in the process of becoming its own class — confirm and recategorize if needed." },
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
          summary: cachedSub.summary && cachedSub.summary !== "" ? cachedSub.summary : defaultSub.summary,
          features: cachedSub.features && cachedSub.features.length > 0 ? cachedSub.features : defaultSub.features,
          note: cachedSub.note && cachedSub.note !== "" ? cachedSub.note : defaultSub.note,
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
          tagline: cachedRace.tagline && cachedRace.tagline !== "" ? cachedRace.tagline : defaultRace.tagline,
          description: cachedRace.description && cachedRace.description !== "" ? cachedRace.description : defaultRace.description,
          traits: cachedRace.traits && cachedRace.traits.length > 0 ? cachedRace.traits : defaultRace.traits,
          archetypes: cachedRace.archetypes && cachedRace.archetypes.length > 0 ? cachedRace.archetypes : defaultRace.archetypes,
          note: cachedRace.note && cachedRace.note !== "" ? cachedRace.note : defaultRace.note,
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
          summary: cachedCh.summary && cachedCh.summary !== "" ? cachedCh.summary : defaultCh.summary,
          keyTraits: cachedCh.keyTraits && cachedCh.keyTraits.length > 0 ? cachedCh.keyTraits : defaultCh.keyTraits,
          note: cachedCh.note && cachedCh.note !== "" ? cachedCh.note : defaultCh.note,
          race: cachedCh.race && cachedCh.race !== "" ? cachedCh.race : defaultCh.race,
          class: cachedCh.class && cachedCh.class !== "" ? cachedCh.class : defaultCh.class,
          patron: cachedCh.patron && cachedCh.patron !== "" ? cachedCh.patron : defaultCh.patron,
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
    minHeight: 'calc(100vh - 100px)',
  },
  sidebar: {
    width: '260px',
    background: 'linear-gradient(180deg, #e8d5a0 0%, #d9bf7f 100%)',
    borderRight: '3px solid #8b6914',
    padding: '20px 0',
    overflowY: 'auto',
    position: 'sticky',
    top: 0,
    height: 'calc(100vh - 100px)',
    boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.1)',
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
  const [expandedSections, setExpandedSections] = useState(new Set(['races', 'classes', 'subclasses', 'characters']));

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
    if (editMode) {
      setEditMode(false);
      return;
    }
    if (dmAuthed) {
      setEditMode(true);
    } else {
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
            count={content.races.filter((r) => r.isParent || !r.parentRace).length}
            expanded={expandedSections.has('races')}
            onClick={() => toggleSectionExpanded('races')}
          />
          {expandedSections.has('races') && (() => {
            // C.O.L. is a standalone race (no parentRace, no isParent flag — render as flat item)
            // Everything else groups under its parentRace
            const standalone = content.races.filter((r) => !r.parentRace && !r.isParent);
            const order = content.raceOrder || [];
            return (
              <>
                {standalone.map((r) => (
                  <div
                    key={r.id}
                    style={{ ...styles.navSub, ...(section === 'races' && activeId === r.id ? styles.navSubActive : {}) }}
                    onClick={() => goTo('races', r.id)}
                  >
                    {r.name}
                  </div>
                ))}
                {order.map((parentRace) => {
                  if (parentRace === "Conduit of Life (C.O.L.)") return null; // already rendered above
                  const racesInFamily = content.races.filter((r) => r.parentRace === parentRace);
                  if (racesInFamily.length === 0) return null;
                  const parent = racesInFamily.find((r) => r.isParent);
                  const subraces = racesInFamily.filter((r) => !r.isParent);
                  const isExpanded = expandedRaces.has(parentRace);
                  const hasActive = section === 'races' && racesInFamily.some((r) => r.id === activeId);
                  return (
                    <div key={parentRace}>
                      <div
                        style={{ ...styles.parentGroup, ...(hasActive ? styles.parentGroupActive : {}) }}
                        onClick={() => {
                          // Clicking the parent name navigates AND toggles expansion
                          if (parent) goTo('races', parent.id);
                          toggleRaceExpanded(parentRace);
                        }}
                      >
                        <ChevronRight
                          size={12}
                          style={{
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.15s',
                          }}
                        />
                        {parentRace}
                        <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#8b6914', fontWeight: 400, fontStyle: 'italic' }}>
                          {subraces.length}
                        </span>
                      </div>
                      {isExpanded && subraces.map((sr) => {
                        const isActive = section === 'races' && activeId === sr.id;
                        const isEmpty = !sr.summary && !sr.description && (!sr.traits || sr.traits.length === 0);
                        return (
                          <div
                            key={sr.id}
                            style={{ ...styles.subclassChild, ...(isActive ? styles.subclassChildActive : {}) }}
                            onClick={() => goTo('races', sr.id)}
                          >
                            <span>{sr.name}</span>
                            {isEmpty && <span style={styles.emptyMarker}>· empty</span>}
                          </div>
                        );
                      })}
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
          {expandedSections.has('classes') && content.classes.map((c) => (
            <div
              key={c.id}
              style={{ ...styles.navSub, ...(section === 'classes' && activeId === c.id ? styles.navSubActive : {}) }}
              onClick={() => goTo('classes', c.id)}
            >
              {c.name}
            </div>
          ))}

          <SectionToggle
            label="Subclasses"
            count={content.subclasses.length}
            expanded={expandedSections.has('subclasses')}
            onClick={() => toggleSectionExpanded('subclasses')}
          />
          {expandedSections.has('subclasses') && content.parentClassOrder.map((parentClass) => {
            const subsForClass = content.subclasses.filter((s) => s.parentClass === parentClass);
            if (subsForClass.length === 0) return null;
            const isExpanded = expandedClasses.has(parentClass);
            const hasActive = section === 'subclasses' && subsForClass.some((s) => s.id === activeId);
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
                    {subsForClass.length}
                  </span>
                </div>
                {isExpanded && subsForClass.map((s) => {
                  const isActive = section === 'subclasses' && activeId === s.id;
                  const isEmpty = !s.summary && (!s.features || s.features.length === 0);
                  return (
                    <div
                      key={s.id}
                      style={{ ...styles.subclassChild, ...(isActive ? styles.subclassChildActive : {}) }}
                      onClick={() => goTo('subclasses', s.id)}
                    >
                      <span>{s.name}</span>
                      {s.priority === 'highest' && <span style={styles.pillPriority}>P1</span>}
                      {s.priority === 'second' && <span style={styles.pillPriority}>P2</span>}
                      {isEmpty && <span style={styles.emptyMarker}>· empty</span>}
                    </div>
                  );
                })}
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
        </main>
      </div>

      <div style={{ ...styles.saveStatus, ...(saveStatus ? styles.saveStatusVisible : {}) }}>
        {saveStatus}
      </div>
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

  const updateField = (field, value) => {
    const updated = content.races.map((r) => (r.id === race.id ? { ...r, [field]: value } : r));
    persistChange({ ...content, races: updated });
  };

  const isSubrace = race.parentRace && !race.isParent && race.parentRace !== race.name;
  const isEmpty = !race.description && !race.summary && (!race.traits || race.traits.length === 0);

  return (
    <div>
      <h1 style={styles.pageHeading}>{race.name}</h1>
      {isSubrace && (
        <div style={{ marginBottom: '14px' }}>
          <span style={styles.pill}>{race.parentRace} Subrace</span>
        </div>
      )}
      {race.tagline && (
        <p style={{ ...styles.bodyText, fontStyle: 'italic', color: '#5c4020', fontSize: '16px' }}>{race.tagline}</p>
      )}

      {editMode ? (
        <textarea
          style={styles.textarea}
          value={race.description || ''}
          onChange={(e) => updateField('description', e.target.value)}
        />
      ) : (
        race.description && <p style={styles.bodyText}>{race.description}</p>
      )}

      {race.summary && !race.description && (
        <p style={styles.bodyText}>{race.summary}</p>
      )}

      {isEmpty && (
        <div style={{ ...styles.card, marginTop: '20px', background: 'rgba(201, 165, 92, 0.15)', borderColor: '#c9a55c' }}>
          <p style={{ ...styles.bodyText, margin: 0, fontStyle: 'italic' }}>
            This entry has not been written yet. Source material exists in the races document — content will be drafted in a future pass.
          </p>
        </div>
      )}

      {race.traits && race.traits.length > 0 && (
        <>
          <h2 style={styles.sectionHeading}>Traits</h2>
          {race.traits.map((t, i) => (
            <div key={i} style={styles.featureCard}>
              <div style={styles.featureName}>{t.name}</div>
              <p style={{ ...styles.bodyText, margin: 0 }}>{t.text}</p>
            </div>
          ))}
        </>
      )}

      {race.archetypes && race.archetypes.length > 0 && (
        <>
          <h2 style={styles.sectionHeading}>Class Tunings</h2>
          {race.archetypes.map((a, i) => (
            <div key={i} style={styles.featureCard}>
              <div style={styles.featureName}>{a.name}</div>
              <p style={{ ...styles.bodyText, margin: 0 }}>{a.text}</p>
            </div>
          ))}
        </>
      )}

      {/* If this is a parent race, list its subraces */}
      {race.isParent && (() => {
        const subraces = content.races.filter((r) => r.parentRace === race.parentRace && !r.isParent);
        if (subraces.length === 0) return null;
        return (
          <>
            <h2 style={styles.sectionHeading}>Subraces</h2>
            {subraces.map((sr) => (
              <div key={sr.id} style={styles.featureCard}>
                <div style={styles.featureName}>{sr.name}</div>
                {sr.summary && <p style={{ ...styles.bodyText, margin: 0 }}>{sr.summary}</p>}
                {!sr.summary && <p style={{ ...styles.bodyText, margin: 0, fontStyle: 'italic', color: '#8b6914' }}>Not yet written.</p>}
              </div>
            ))}
          </>
        );
      })()}

      {race.note && (
        <div style={{ ...styles.card, marginTop: '20px', fontStyle: 'italic', color: '#5c4020' }}>
          <strong>Source note:</strong> {race.note}
        </div>
      )}
    </div>
  );
}

function ClassesPage({ content, activeId, editMode, persistChange }) {
  const cls = content.classes.find((c) => c.id === activeId) || content.classes[0];
  if (!cls) return <p style={styles.bodyText}>No classes defined.</p>;

  const updateField = (field, value) => {
    const updated = content.classes.map((c) => (c.id === cls.id ? { ...c, [field]: value } : c));
    persistChange({ ...content, classes: updated });
  };

  return (
    <div>
      <h1 style={styles.pageHeading}>{cls.name}</h1>
      <div style={{ marginBottom: '14px' }}>
        <span style={styles.pill}>Primary: {cls.primary}</span>
        <span style={styles.pill}>Hit Die: {cls.hitDie}</span>
      </div>

      {editMode ? (
        <textarea style={styles.textarea} value={cls.summary} onChange={(e) => updateField('summary', e.target.value)} />
      ) : (
        <p style={styles.bodyText}>{cls.summary}</p>
      )}

      {cls.proficiencies && (
        <>
          <h2 style={styles.sectionHeading}>Proficiencies</h2>
          <div style={styles.card}>
            <p style={styles.bodyText}><strong>Saving Throws:</strong> {cls.proficiencies.savingThrows}</p>
            <p style={styles.bodyText}><strong>Skills:</strong> {cls.proficiencies.skills}</p>
            <p style={styles.bodyText}><strong>Weapons:</strong> {cls.proficiencies.weapons}</p>
            <p style={{ ...styles.bodyText, margin: 0 }}><strong>Armor:</strong> {cls.proficiencies.armor}</p>
          </div>
        </>
      )}

      {cls.progression && cls.progression.length > 0 && (
        <>
          <h2 style={styles.sectionHeading}>Class Progression</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Lvl</th>
                  <th style={styles.th}>Prof.</th>
                  {cls.id === 'esper' && <th style={styles.th}>Talents</th>}
                  {cls.id === 'esper' && <th style={styles.th}>TP</th>}
                  {cls.id === 'esper' && <th style={styles.th}>ESP Die</th>}
                  <th style={styles.th}>Features</th>
                </tr>
              </thead>
              <tbody>
                {cls.progression.map((row) => (
                  <tr key={row.level}>
                    <td style={styles.td}>{row.level}</td>
                    <td style={styles.td}>+{Math.ceil(row.level / 4) + 1}</td>
                    {cls.id === 'esper' && <td style={styles.td}>{row.talents}</td>}
                    {cls.id === 'esper' && <td style={styles.td}>{row.tp}</td>}
                    {cls.id === 'esper' && <td style={styles.td}>{row.espDie}</td>}
                    <td style={styles.td}>{row.features}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 style={styles.sectionHeading}>Core Features</h2>
      {cls.coreFeatures?.map((f, i) => (
        <div key={i} style={styles.featureCard}>
          <div style={styles.featureLevel}>Level {f.level}</div>
          <div style={styles.featureName}>{f.name}</div>
          <p style={{ ...styles.bodyText, margin: 0 }}>{f.text}</p>
        </div>
      ))}

      {cls.notes && (
        <div style={{ ...styles.card, marginTop: '20px', fontStyle: 'italic', color: '#5c4020' }}>
          <strong>Source note:</strong> {cls.notes}
        </div>
      )}
    </div>
  );
}

function SubclassesPage({ content, activeId, editMode, persistChange }) {
  const sub = content.subclasses.find((s) => s.id === activeId) || content.subclasses[0];
  if (!sub) return <p style={styles.bodyText}>No subclasses defined.</p>;

  const isEmpty = !sub.summary && (!sub.features || sub.features.length === 0);

  return (
    <div>
      <h1 style={styles.pageHeading}>{sub.name}</h1>
      <div style={{ marginBottom: '14px' }}>
        <span style={styles.pill}>{sub.parentClass} Subclass</span>
        {sub.priority === 'highest' && <span style={{ ...styles.pill, background: '#c9a55c', color: '#3b2615' }}>Priority Rewrite — Tier 1</span>}
        {sub.priority === 'second' && <span style={{ ...styles.pill, background: '#c9a55c', color: '#3b2615' }}>Priority Rewrite — Tier 2</span>}
      </div>

      {sub.summary && <p style={styles.bodyText}>{sub.summary}</p>}

      {isEmpty && (
        <div style={{ ...styles.card, marginTop: '20px', background: 'rgba(201, 165, 92, 0.15)', borderColor: '#c9a55c' }}>
          <p style={{ ...styles.bodyText, margin: 0, fontStyle: 'italic' }}>
            This entry has not been written yet. Source material exists in the homebrew documents — content will be drafted in a future pass.
          </p>
        </div>
      )}

      {sub.features && sub.features.length > 0 && (
        <>
          <h2 style={styles.sectionHeading}>Features</h2>
          {sub.features.map((f, i) => (
            <div key={i} style={styles.featureCard}>
              <div style={styles.featureLevel}>Level {f.level}</div>
              <div style={styles.featureName}>{f.name}</div>
              <p style={{ ...styles.bodyText, margin: 0 }}>{f.text}</p>
            </div>
          ))}
        </>
      )}

      {sub.note && (
        <div style={{ ...styles.card, marginTop: '20px', fontStyle: 'italic', color: '#5c4020' }}>
          <strong>Source note:</strong> {sub.note}
        </div>
      )}
    </div>
  );
}

function CharactersPage({ content, activeId, editMode, persistChange }) {
  const ch = content.characters.find((c) => c.id === activeId) || content.characters[0];
  if (!ch) return <p style={styles.bodyText}>No characters defined.</p>;

  const isEmpty = !ch.summary && (!ch.keyTraits || ch.keyTraits.length === 0);

  return (
    <div>
      <h1 style={styles.pageHeading}>{ch.name}</h1>
      <div style={{ marginBottom: '14px' }}>
        {ch.campaign && <span style={styles.pill}>{ch.campaign}</span>}
        {ch.role === 'player' && <span style={{ ...styles.pill, background: '#5c4020' }}>Player Character</span>}
        {ch.role === 'connected' && <span style={{ ...styles.pill, background: '#8b6914' }}>Connected</span>}
        {ch.role === 'enemy' && <span style={{ ...styles.pill, background: '#5c1414' }}>Enemy</span>}
        {ch.status === 'deceased' && <span style={{ ...styles.pill, background: '#3b2615' }}>Deceased</span>}
        {ch.status === 'freed' && <span style={{ ...styles.pill, background: '#5c8a3a' }}>Freed</span>}
        {ch.category && <span style={{ ...styles.pill, background: '#c9a55c', color: '#3b2615' }}>{ch.category}</span>}
      </div>
      {(ch.race || ch.class || (ch.patron && ch.patron !== '—' && ch.patron !== '')) && (
        <div style={{ marginBottom: '14px' }}>
          {ch.race && <span style={styles.pill}>{ch.race}</span>}
          {ch.class && <span style={styles.pill}>{ch.class}</span>}
          {ch.patron && ch.patron !== '—' && ch.patron !== '' && <span style={styles.pill}>Patron: {ch.patron}</span>}
        </div>
      )}

      {ch.placeholder && (
        <div style={{ ...styles.card, marginTop: '12px', background: 'rgba(201, 165, 92, 0.15)', borderColor: '#c9a55c' }}>
          <p style={{ ...styles.bodyText, margin: 0, fontStyle: 'italic' }}>
            <strong>Placeholder.</strong> Name and details to be filled in.
          </p>
        </div>
      )}

      {ch.summary && <p style={styles.bodyText}>{ch.summary}</p>}

      {!ch.placeholder && isEmpty && (
        <div style={{ ...styles.card, marginTop: '20px', background: 'rgba(201, 165, 92, 0.15)', borderColor: '#c9a55c' }}>
          <p style={{ ...styles.bodyText, margin: 0, fontStyle: 'italic' }}>
            No details have been written for this character yet.
          </p>
        </div>
      )}

      {ch.keyTraits && ch.keyTraits.length > 0 && (
        <>
          <h2 style={styles.sectionHeading}>Key Traits</h2>
          {ch.keyTraits.map((t, i) => (
            <div key={i} style={styles.featureCard}>
              <p style={{ ...styles.bodyText, margin: 0 }}>{t}</p>
            </div>
          ))}
        </>
      )}

      {ch.note && (
        <div style={{ ...styles.card, marginTop: '20px', fontStyle: 'italic', color: '#5c4020' }}>
          <strong>Source note:</strong> {ch.note}
        </div>
      )}
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
