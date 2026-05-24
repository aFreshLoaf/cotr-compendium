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
    { id: "path-of-the-godslayer", name: "Path of the Godslayer", parentClass: "Barbarian", priority: "highest", summary: "Barbarians who channel their rage to defy and combat divine beings, resisting celestial and fiendish power.", features: [
      { level: 3, name: "Divine Defiance", text: "Resistance to radiant/necrotic while raging; add rage bonus to attacks vs celestials, fiends, deity-linked creatures; advantage on saves vs divine/celestial sources." },
      { level: 6, name: "Wrathful Retaliation", text: "Reaction when hit within 5 ft while raging: deal force damage equal to Barbarian level + Constitution modifier." },
      { level: 10, name: "Juggernaut's Resilience", text: "While raging, resistance to all damage except psychic. If reduced to 0 HP and not killed outright, Con save (DC 10 + half damage taken); success = drop to 1 HP. Uses = Con modifier (min 1), long rest." },
      { level: 14, name: "Slayer of Gods", text: "On hit while raging, deal additional force damage = 2x Barbarian level. Celestial/deity-linked target makes Wisdom save DC 8+PB+CON or frightened 1 minute. Uses = Con modifier (min 1), long rest." }
    ], note: "" },
    { id: "path-of-the-drunk", name: "Path of the Drunk", parentClass: "Barbarian", summary: "A Barbarian subclass that uses drunken, unpredictable movement to evade attacks and gain resilience.", features: [
      { level: 3, name: "Drunken Evasion", text: "Advantage on Dex saves; attacks against you have disadvantage; bonus action drink grants temp HP = Barbarian level + Con modifier for 1 hour." },
      { level: 6, name: "Unpredictable Movement", text: "Reaction: impose disadvantage on one attack roll against you while raging. Uses = Con modifier (min 1), long rest." },
      { level: 10, name: "Liquid Courage", text: "While raging: immune to frightened, resistance to psychic; reaction melee attack when hit within 5 ft, on hit Str save DC 8+PB+STR or prone." },
      { level: 14, name: "Drunken Mastery", text: "While raging: cannot be knocked prone, advantage on Con saves; bonus action drink grants temp HP = twice Barbarian level + Con modifier." }
    ], note: "" },
    { id: "path-of-the-tarasque", name: "Path of the Tarasque", parentClass: "Barbarian", priority: "second", summary: "Barbarians channel the primal power of the legendary Tarasque, gaining unmatched resilience, fury, speed, and might.", features: [
      { level: 3, name: "Tarasque Resilience", text: "While raging, resistance to all damage except psychic; HP max increases by 2x Barbarian level." },
      { level: 6, name: "Tarasque's Fury", text: "While raging, add Constitution modifier to melee damage; once per turn force Str save DC 8+PB+STR or prone." },
      { level: 10, name: "Tarasque's Speed", text: "While raging: +20 ft movement, Dash as bonus action, advantage on Dex saves." },
      { level: 14, name: "Tarasque's Might", text: "While raging: size Large, +5 ft reach, advantage on STR checks/saves, melee hits deal +2d12. Uses = CON mod, long rest." },
      { level: 14, name: "Tarasque's Roar", text: "Action: creatures of your choice within 30 ft make Wisdom save DC 8+PB+CON or frightened 1 minute. Once per long rest." }
    ], note: "" },
    { id: "college-of-godslaying", name: "College of Godslaying", parentClass: "Bard", summary: "Bards who weaponize divine lore to weaken and destroy celestials, fiends, and gods through song and spell.", features: [
      { level: 3, name: "Bonus Proficiencies", text: "Proficiency with medium armor, shields, martial weapons, and Religion." },
      { level: 3, name: "Divine Scorn", text: "Reaction+Bardic Inspiration: subtract Inspiration die from creature's roll; on miss deal that much radiant/necrotic. Die adds to damage vs celestials/fiends once per turn." },
      { level: 6, name: "Hymn of Defiance", text: "Action: 30-ft aura 1 min. Celestials/fiends Wisdom save vs spell DC or can't cast until next turn. Allies gain resistance to radiant/necrotic. Uses = Cha modifier (min 1), long rest." },
      { level: 14, name: "Divine Weakness", text: "Action: target Wisdom save vs spell DC or marked 1 min: disadvantage on saves vs your spells, +Cha modifier radiant/necrotic on hits (doubled for celestials/fiends), can't regain HP. Uses = Cha modifier (min 1), long rest." }
    ], note: "" },
    { id: "college-of-the-sun", name: "College of the Sun", parentClass: "Bard", summary: "Bards channel Lathander's radiant power through archery and music to control the battlefield.", features: [
      { level: 3, name: "Bonus Proficiencies", text: "Proficiency with longbows and shortbows; learn Guidance cantrip (free)." },
      { level: 3, name: "Radiant Performance", text: "Bardic Inspiration grants temp HP = Bard level; if used on attack hit, +1d6 radiant damage." },
      { level: 6, name: "Sunlit Arrows", text: "Expend Bardic Inspiration on ranged hit for +2d6 radiant; target Con save DC 8+prof+Cha or blinded until end of next turn." },
      { level: 14, name: "Divine Melody", text: "Song of Rest grants one: resistance to radiant/fire 1hr, +2 ranged attack rolls 1hr, or +Cha mod HP regained." }
    ], note: "" },
    { id: "college-of-souls", name: "College of Souls", parentClass: "Bard", summary: "A bardic college that animates and commands the dead through haunting musical performances.", features: [
      { level: 3, name: "Necrotic Performance", text: "Expend Bardic Inspiration to animate a corpse within 30 ft as zombie/skeleton for 1 hour; control up to Cha modifier undead." },
      { level: 6, name: "Requiem of Resilience", text: "Bonus action: controlled undead gain temp HP = Bard level + Cha modifier; advantage on turn/destroy saves." },
      { level: 14, name: "Symphony of the Damned", text: "Cast Animate Dead without spell slot; animate two extra corpses; controlled undead gain +Cha modifier to attack and damage rolls." }
    ], note: "" },
    { id: "college-of-the-siren", name: "College of the Siren", parentClass: "Bard", summary: "", features: [], note: "" },
    { id: "college-of-the-arcane-marksman", name: "College of the Arcane Marksman", parentClass: "Bard", summary: "", features: [], note: "" },
    { id: "domain-of-godslaying", name: "Domain of Godslaying", parentClass: "Cleric", summary: "Clerics who draw power from Death to oppose and slay divine entities using necrotic and elemental forces.", features: [
      { level: 1, name: "Domain Spells", text: "Level 1: Wrathful Smite, Inflict Wounds. Level 3: Ray of Enfeeblement, Silence. Level 5: Spirit Guardians, Bestow Curse. Level 7: Blight, Banishment. Level 9: Destructive Wave, Dispel Evil and Good." },
      { level: 1, name: "Bonus Proficiencies", text: "Heavy armor and martial weapons." },
      { level: 1, name: "Death's Gift", text: "On weapon hit, deal bonus necrotic = Wisdom modifier. Uses = proficiency bonus per long rest." },
      { level: 2, name: "Channel Divinity: Divine Banishment", text: "Action, present holy symbol: one creature within 30 ft makes Charisma save or banished to home plane; if native, stunned until end of your next turn. Celestials/fiends have disadvantage." },
      { level: 6, name: "Divine Slayer", text: "On hit, ignore necrotic resistance/immunity. +1d8 necrotic vs celestials/divine creatures. Add Wis modifier to spell damage vs divine creatures." },
      { level: 8, name: "Potent Spellcasting", text: "Add Wisdom modifier to cleric cantrip damage." },
      { level: 17, name: "Death's Reprisal", text: "Action, 1-minute aura. On reducing a divine creature to 0 HP, choose to destroy it utterly (no resurrection < Wish). Once per turn on hit vs divine creature: +3d10 necrotic. Once per long rest." }
    ], note: "" },
    { id: "domain-of-archangels", name: "Domain of Archangels", parentClass: "Cleric", summary: "Clerics blessed by celestial beings who manifest divine stars and summon archangels to smite foes.", features: [
      { level: 1, name: "Domain Spells", text: "Level 1: Guiding Bolt, Shield of Faith. Level 3: Spiritual Weapon, Moonbeam. Level 5: Daylight, Spirit Guardians. Level 7: Guardian of Faith, Divination. Level 9: Flame Strike, Holy Weapon." },
      { level: 1, name: "Celestial Stars", text: "Bonus action: summon stars = Wisdom modifier (min 1) for 1 minute; reaction to reduce damage by 1d8. Stars disappear after intercepting." },
      { level: 2, name: "Channel Divinity: Summon Archangel", text: "Action: archangel appears within 30 ft and makes a melee spell attack vs a creature of your choice for 2d10 + cleric level radiant, then disappears." },
      { level: 6, name: "Radiant Shield", text: "+2 AC while at least one star active. When a star intercepts an attack, attacker takes radiant = Wisdom modifier (min 1)." },
      { level: 8, name: "Potent Spellcasting", text: "Add Wisdom modifier to cleric cantrip damage." },
      { level: 17, name: "Archangel's Wrath", text: "Channel Divinity summons up to 3 archangels, each attacking different creature within 30 ft for 4d10 + cleric level radiant. Bonus action: sprout wings, +1 AC, fly speed = movement speed." }
    ], note: "" },
    { id: "might-domain", name: "Might Domain", parentClass: "Cleric", summary: "", features: [], note: "" },
    { id: "domain-of-platinum-dragon", name: "Domain of the Platinum Dragon", parentClass: "Cleric", summary: "", features: [], note: "Bahamut-themed domain." },
    { id: "circle-of-defiance", name: "Circle of Defiance", parentClass: "Druid", summary: "Druids who reject divine influence and wield primal power to disrupt and punish divine magic.", features: [
      { level: 2, name: "Circle Spells", text: "Level 3: Detect Evil and Good, Magic Missile. Level 5: Counterspell, Dispel Magic. Level 7: Banishment, Guardian of Nature. Level 9: Dispel Evil and Good, Wall of Force." },
      { level: 2, name: "Primal Defiance", text: "Learn Thaumaturgy. Creatures with divine ancestry have disadvantage on saves against your spells. Channel the Wild: reaction to creature casting a spell within 60 ft — expend Wild Shape; creature Con save vs spell DC or spell fizzles and it takes force = druid level. Once per short or long rest." },
      { level: 6, name: "Savage Transformation", text: "Wild Shape forms count as magical. +1d6 necrotic vs divine creatures in beast form. Gain temp HP = 2x druid level on transform." },
      { level: 10, name: "Nature's Rejection", text: "Resistance to radiant; immune to charm/fright from celestials/fiends. Action, expend spell slot: celestial/fiend/divine caster within 60 ft Wisdom save vs spell DC or can't regain HP 1 minute. Once per long rest." },
      { level: 14, name: "Avatar of the Primordial Wild", text: "Bonus action, 1 minute: attacks bypass resistances/immunities; +2d10 necrotic vs celestials/fiends; temp HP = half max HP on entry. Once per long rest." }
    ], note: "" },
    { id: "circle-of-dragons", name: "Circle of Dragons", parentClass: "Druid", summary: "", features: [], note: "" },
    { id: "circle-of-fey", name: "Circle of the Fey", parentClass: "Druid", summary: "", features: [], note: "" },
    { id: "circle-of-poison", name: "Circle of Poison", parentClass: "Druid", summary: "", features: [], note: "" },
    { id: "mortal-guardian", name: "The Mortal Guardian", parentClass: "Fighter", summary: "", features: [], note: "" },
    { id: "gravitorian", name: "Gravitorian", parentClass: "Fighter", priority: "second", summary: "", features: [], note: "" },
    { id: "blood-knight", name: "Blood Knight", parentClass: "Fighter", summary: "", features: [], note: "" },
    { id: "valkyrie", name: "Valkyrie", parentClass: "Fighter", summary: "", features: [], note: "Only female characters can use this subclass." },
    { id: "dragon-knight", name: "Dragon Knight", parentClass: "Fighter", summary: "A fighter subclass with six Chromatic Dragon Knighthoods, each granting elemental powers tied to a chosen dragon type.", features: [
      { level: 3, name: "Draconic Heritage", text: "Choose Knighthood: Inferno (Red/Fire), Tempest (Blue/Lightning), Verglas (White/Cold), Elixir (Green/Poison), Decay (Black/Acid), Encephalon (Purple/Psychic). HP max +1 per class level; resistance to chosen damage type. Dragon's Breath: action, 15-ft cone, Dex save DC 8+PB+CON, 4d8 damage (scales 6d8 at 10th, 10d8 at 18th). Uses = Con modifier, long rest." },
      { level: 7, name: "Draconic Strength", text: "Critical hits on 19-20. On hit, deal +2d8 dragon-type damage (3d8 at 12th). Uses = proficiency bonus, long rest." },
      { level: 10, name: "Dragon's Might", text: "Knighthood-specific passive on hit (Inferno: 1d6 fire aura; Tempest: 1d6 lightning splash; Verglas: disadvantage on next attack; Elixir: Con save or poisoned 1 min; Decay: 1d6 acid aura; Encephalon: 1d4 psychic splash). +2 AC regardless of armor." },
      { level: 15, name: "Draconic Transformation", text: "Action, 1-minute hybrid form: fly 40 ft, temp HP = 2x fighter level, +2d8 dragon-type on all attacks. Once per long rest." },
      { level: 18, name: "Dragon's Fury", text: "On hit, deal +6d10 dragon-type damage. STR and CON +2 (max 24). Dragon Transformation lasts 10 minutes." }
    ], note: "Single subclass with six Knighthood variants chosen at 3rd level: Inferno (Red — Fire), Tempest (Blue — Lightning), Verglas (White — Cold), Elixir (Green — Poison), Decay (Black — Acid), Encephalon (Purple — Psychic)." },
    { id: "air-blade", name: "Air Blade", parentClass: "Gensarch", summary: "A swift melee subclass that chains rapid attacks with wind-enhanced slashing strikes.", features: [
      { level: 3, name: "Whirlwind Strikes", text: "Bonus action extra unarmed/light weapon attack; hit deals Elemental Damage Die slashing damage." },
      { level: 7, name: "Cyclone Dance", text: "Once per turn, 2+ hits force Dex save or target knocked prone or disarmed." },
      { level: 11, name: "Gale Step", text: "Move up to 40 ft between attacks; hits don't trigger opportunity attacks (misses impose disadvantage instead)." },
      { level: 15, name: "Blade Tempest", text: "Once per long rest, flurry of four attacks as one action. Each hit adds 1 Genn Die slashing damage." }
    ], note: "Air Gensarch sub-path." },
    { id: "air-acrobat", name: "Air Acrobat", parentClass: "Gensarch", summary: "An aerial subclass that gains flying speed, momentum-powered strikes, and evasive aerial reactions.", features: [
      { level: 3, name: "Soaring Style", text: "Fly speed 10 ft (20 ft at 7th, 30 ft at 15th); airborne attacks have disadvantage until first hit." },
      { level: 7, name: "Momentum Strike", text: "Move 20+ ft before attack: deal double proficiency bonus additional damage and force Str save or push 15 ft." },
      { level: 11, name: "Reactive Lift", text: "Reaction: fly 15 ft up when targeted by melee; if attack misses, make opportunity attack as part of reaction." },
      { level: 15, name: "Hurricane Pivot", text: "When hit by an AOE or spell, expend 1 Genn Die to halve the damage and move 30 ft in any direction." }
    ], note: "Air Gensarch sub-path." },
    { id: "aerial-sniper", name: "Aerial Sniper", parentClass: "Gensarch", summary: "A wind-based subclass that creates ranged air blasts and vacuum attacks to strike enemies from a distance.", features: [
      { level: 3, name: "Air Bolts", text: "Action: ranged wind blast 120 ft, Dex modifier to attack, 1d10 thunder/slashing/piercing magical damage." },
      { level: 7, name: "Compressed Air Bolt", text: "Once/short rest: charge one turn, fire 3d10 damage in 5 ft wide, 60 ft line; Dex save half." },
      { level: 11, name: "Static Dome", text: "+2 AC, resistance to ranged weapon damage for 1 minute. Recharge on short rest." },
      { level: 15, name: "Vacuum Shot", text: "Once/long rest: attack up to 3 enemies in a line; each takes Elemental Damage Die + 3d10 thunder, ignores cover/armor." }
    ], note: "Air Gensarch sub-path." },
    { id: "stone-shield", name: "Stone Shield", parentClass: "Gensarch", summary: "A defensive subclass that summons floating stone shields to protect allies and control the battlefield.", features: [
      { level: 3, name: "Guardian Shields", text: "Bonus action: summon floating stone shields up to Proficiency Bonus in number; each grants +2 AC to you or ally within 30 ft." },
      { level: 7, name: "Reactive Wall", text: "Reaction: raise earth wall (5 ft wide, 10 ft tall) between attacker and target, providing three-quarters cover." },
      { level: 11, name: "Shield Redirect", text: "Reaction when attacker misses ally protected by your shield: push attacker 10 ft away or knock prone." },
      { level: 15, name: "Fortress of Stone", text: "Action: 15 ft radius dome; allies inside gain +2 AC, resistance to all damage. 1 minute, once per long rest." }
    ], note: "Earth Gensarch sub-path." },
    { id: "earth-shaker", name: "Earth Shaker", parentClass: "Gensarch", summary: "A ground-shaking subclass that controls the battlefield through tremors and seismic force.", features: [
      { level: 3, name: "Tremor Step", text: "After moving 15 ft, bonus action quake: creatures within 5 ft make Dex save or fall prone and take 1d6 bludgeoning." },
      { level: 7, name: "Ground Control", text: "Action: 20 ft radius becomes difficult terrain; enemies move half speed, disadvantage on Strength checks." },
      { level: 11, name: "Seismic Shockwave", text: "Once per short rest: 15 ft cone slam, Strength save or 4d6 bludgeoning and knocked prone." },
      { level: 15, name: "Quaking Core", text: "Gain tremorsense 30 ft; creatures within 10 ft take Elemental Damage Die bludgeoning at turn start if touching the ground." }
    ], note: "Earth Gensarch sub-path." },
    { id: "earth-smith", name: "Earth Smith", parentClass: "Gensarch", summary: "A subclass that summons magical stone weapons and armor from the ground to fight as a living siege engine.", features: [
      { level: 3, name: "Stoneforging", text: "Bonus action: summon magical weapon/armor from ground. Floating weapons move 30 ft and attack via bonus action. Control cap = Proficiency Bonus + Con modifier." },
      { level: 7, name: "Guardian Armory", text: "Controlled weapons make opportunity attacks when enemies move near them. Grant one floating weapon to ally within 30 ft." },
      { level: 11, name: "Weapon Dance", text: "Once per turn, bonus action: command all floating weapons to attack simultaneously, each dealing Elemental Damage Die." },
      { level: 15, name: "Living Arsenal", text: "Summon golem-like form for 1 minute: +2 AC, resistance to nonmagical B/P/S; each of your attacks also strikes with a second weapon for +2d8 force." }
    ], note: "Earth Gensarch sub-path." },
    { id: "devouring-flames", name: "Devouring Flames", parentClass: "Gensarch", summary: "A fire subclass focused on consuming enemies with passion-fueled flame bursts and area explosions.", features: [
      { level: 3, name: "Passion Burn", text: "Spend 1 Passion Die (1d10) for extra damage; enemies Wisdom save or disadvantage on attacks against others. Passion Dice = proficiency bonus, refresh on short rest." },
      { level: 7, name: "Flame Expansion", text: "Action: 15 ft cone, Dex save, 6d6 fire damage (half on success). Scales to 30 ft/8d6 and 60 ft/10d6." },
      { level: 11, name: "Infernal Bloom", text: "When spending a Passion Die, all creatures within 10 ft take 2d10 fire damage, no save." },
      { level: 15, name: "Burnout Burst", text: "Once per long rest: expend all Passion Dice; creatures within 30 ft take 1d10 per die + Elemental Damage Die." }
    ], note: "Fire Gensarch sub-path." },
    { id: "flames-of-the-dance", name: "Flames of the Dance", parentClass: "Gensarch", summary: "A subclass focused on mobile flame tactics that reward chaining fire effects in combat.", features: [
      { level: 3, name: "Flame Tactics", text: "Push: Strength save or pushed 10 ft. Lick: target takes 1d6 fire next turn." },
      { level: 7, name: "Ember Step", text: "Movement leaves 5-ft flame trail; enemies take 1d8 fire per 5 ft moved through." },
      { level: 11, name: "Kindling Fury", text: "Each Flame Tactic adds +2 fire damage; at 3 tactics, attacks crit on 19-20." },
      { level: 15, name: "Flame Waltz", text: "Once per turn on reducing creature to 0 HP, teleport 30 ft and make a melee attack." }
    ], note: "Fire Gensarch sub-path." },
    { id: "flames-of-life", name: "Flames of Life", parentClass: "Gensarch", summary: "A subclass that channels flame for healing, restoration, and resurrection.", features: [
      { level: 3, name: "Healing Flame", text: "Spend a Genn Die to heal creature within 30 ft for roll + Cha modifier instead of dealing damage." },
      { level: 7, name: "Warm Ember", text: "Allies within 10 ft regain 1 HP each turn if unconscious; once per long rest revive dead creature with 1 HP." },
      { level: 11, name: "Mass Ignite Heal", text: "Once per long rest: up to 20 creatures within 60 ft regain 2d6+Cha HP and gain fire resistance for 1 minute." },
      { level: 15, name: "Phoenix Core", text: "On reaching 0 HP, explode healing allies 3d10 and dealing 3d10 fire to enemies; return with Genn Die+Cha HP. Once per long rest." }
    ], note: "Fire Gensarch sub-path." },
    { id: "radiant-wave", name: "Radiant Wave", parentClass: "Gensarch", summary: "A support-focused subclass that uses Genn Dice to heal allies and restore HP to multiple creatures.", features: [
      { level: 3, name: "Healing Flow", text: "Use a Genn Die to heal a creature within 30 ft: HP = die roll + Wisdom modifier." },
      { level: 7, name: "Rejuvenating Tide", text: "Bonus action: spend a Genn Die to heal up to 3 creatures within 15 ft (HP = half die + Wis modifier). Uses = proficiency bonus per long rest." },
      { level: 11, name: "Purifying Current", text: "Allies you heal gain advantage on their next saving throw and 1d6 temp HP." },
      { level: 15, name: "Overflow", text: "Once per long rest: when healing with a Genn Die, duplicate the effect to a second creature within 30 ft at no cost. On max die roll, target gains resistance to all damage for 1 round." }
    ], note: "Water Gensarch sub-path." },
    { id: "ice-blade", name: "Ice Blade", parentClass: "Gensarch", summary: "A subclass focused on creating frozen weapons to restrain and damage enemies with cold.", features: [
      { level: 3, name: "Frozen Weaponry", text: "Bonus action: create ice weapon dealing cold damage; hits reduce target speed by 10 ft until end of their next turn." },
      { level: 7, name: "Frost Bind", text: "Once per turn on hit, Strength save DC 8+Prof+Str/Wis or restrained until end of next turn." },
      { level: 11, name: "Shatter Lance", text: "Action: 30 ft line, 5 ft wide; Dex save or 5d8 cold damage, speed halved 1 minute (save repeats to end)." },
      { level: 15, name: "Glacial Guard", text: "Resistance to cold damage; reaction to reduce incoming damage from any source by Elemental Damage Die." }
    ], note: "Water Gensarch sub-path." },
    { id: "wave-step", name: "Wave Step", parentClass: "Gensarch", summary: "A water-style subclass that controls the battlefield through fluid movement, redirection, and vortex attacks.", features: [
      { level: 3, name: "Flow Movement", text: "Dash/Disengage leaves water trail; enemies entering trail Dex save or fall prone; ignore difficult terrain." },
      { level: 7, name: "Crushing Flow", text: "Genn Die damage lets you push 15 ft or pull 10 ft; collision deals 1d8 extra." },
      { level: 11, name: "Whirlpool Spin", text: "Once per turn when missed by melee: attacker Str save or pulled 10 ft and knocked prone; move 10 ft freely." },
      { level: 15, name: "Tidal Collapse", text: "Once per long rest: 20 ft radius, 40 ft cylinder; Str save or pulled to center, prone, 6d10 bludgeoning; difficult terrain 1 minute." }
    ], note: "Water Gensarch sub-path." },
    { id: "way-of-divine-bane", name: "Way of Divine Bane", parentClass: "Monk", summary: "Monks who master ki techniques to resist, weaken, and banish divine and celestial powers.", features: [
      { level: 3, name: "Celestial Antipathy", text: "Melee attacks deal +1d6 radiant/necrotic to celestials/fiends/divine creatures (2d6 at 11th). Cast Detect Evil and Good without ki, uses = Wisdom modifier per long rest." },
      { level: 6, name: "Aura of Defiance", text: "Resistance to radiant and necrotic. Disruptive Ki: reaction when celestial/fiend/divine creature within 30 ft casts a spell, spend 2 ki; creature Wisdom save DC 8+PB+WIS or loses the spell/ability and can't use magical abilities until start of its next turn." },
      { level: 11, name: "Celestial Shatter", text: "Once per turn on hit vs celestial/fiend/divine with unarmed strike, channel ki: creature Con save DC 8+PB+WIS or stunned until end of your next turn + disadvantage on WIS/CHA saves until end of its next turn. Uses = Wisdom modifier per long rest." },
      { level: 17, name: "Godslayer's Aura", text: "Godslayer's Wrath: divine creatures starting turn within 30 ft make Wisdom save or take 3d10 radiant/necrotic and lose resistance/immunity until end of next turn. Divine Banishment: 5 ki, creature Charisma save or banished to home plane for 24 hours. Once per long rest." }
    ], note: "" },
    { id: "way-of-graceful-warrior", name: "Way of the Graceful Warrior", parentClass: "Monk", summary: "", features: [], note: "" },
    { id: "way-of-oni", name: "Way of the Oni", parentClass: "Monk", summary: "", features: [], note: "" },
    { id: "way-of-inner-rage", name: "Way of the Inner Rage", parentClass: "Monk", summary: "A monk subclass focused on radiant purity, celestial transformation, and divine judgment against evil.", features: [
      { level: 3, name: "Purity Palm", text: "Unarmed strikes deal 1d6 radiant damage." },
      { level: 6, name: "Radiant Soul", text: "Resistance to radiant; attackers take Wisdom modifier radiant damage. Purity Palm deals 1d8 radiant." },
      { level: 11, name: "Seal of the Seven Petals", text: "3 ki action: place seal within 5 ft for 1 minute; target has -15 ft speed, disadvantage on attacks, Purity Palm flares for 2d8 radiant." },
      { level: 17, name: "Purest Form: The Six-Winged Ascendant", text: "6 ki bonus action, 1-minute transformation: 120 ft fly speed, immunity to radiant/necrotic, 3d10 radiant unarmed strikes. Purifying Nova: 10d10 radiant in 30 ft radius (Con save, blind 1 min, evil creatures banished on fail)." }
    ], note: "" },
    { id: "way-of-raging-fist", name: "Way of the Raging Fist", parentClass: "Monk", summary: "Monks who master inner fury through discipline, channeling rage into powerful, controlled combat techniques.", features: [
      { level: 3, name: "Furious Strikes", text: "Unarmed strikes deal +1d6 damage (1d8 at 6th, 1d10 at 11th, 1d12 at 17th); usable Monk level times per long rest." },
      { level: 6, name: "Controlled Fury", text: "Spend 3 ki as bonus action: Brooding Fury 1 minute; choose one effect per turn: stun (Con save DC 8+Str+Prof), prone (Str save), disadvantage on next attack, or +1d10 magical bludgeoning." },
      { level: 11, name: "Focused Fury", text: "Bonus action, 3 ki, 1-minute rage: advantage on STR checks/saves; unarmed strikes can be Reckless Attacks; resistance to nonmagical B/P/S." },
      { level: 17, name: "Avatar of Rage", text: "Action, 5 ki, 1 minute: resistance to all damage; unarmed strikes deal +4d6; on reducing creature to 0 HP, make another unarmed strike as bonus action; immune to charmed/frightened." }
    ], note: "" },
    { id: "way-of-tempest", name: "Way of the Tempest", parentClass: "Monk", summary: "Monks of the Tempest harness storm energy, using lightning and thunder techniques to devastate enemies.", features: [
      { level: 3, name: "Storm Strike", text: "Unarmed strikes deal lightning damage; count as magical." },
      { level: 3, name: "Tempest Meditation", text: "10 minutes meditation grants resistance to lightning and thunder for 24 hours." },
      { level: 6, name: "Thunderous Step", text: "Spend 1 ki: teleport 30 ft; creatures within 15 ft Con save or take Martial Arts die + Wisdom modifier thunder." },
      { level: 6, name: "Lightning Reflexes", text: "Advantage on Dex saves against effects you can see." },
      { level: 11, name: "Storm Aura", text: "Spend 3 ki; 10-ft aura 1 minute; allies gain lightning/thunder resistance; enemies take Wisdom modifier lightning per turn." },
      { level: 11, name: "Tempest Wings", text: "Fly speed = walk speed for 10 minutes. Once per long rest." },
      { level: 17, name: "Tempest Strike", text: "Action, 5 ki: lightning bolt within 120 ft, 20-ft radius. Fail = 10d6 lightning + 6d8 thunder + stunned + prone. Success = half, not stunned." },
      { level: 17, name: "Storm's Ascent", text: "Immunity to lightning and thunder. Tempest Wings usable at will." }
    ], note: "" },
    { id: "way-of-flaming-soul", name: "Way of the Flaming Soul", parentClass: "Monk", summary: "Channel primal fire and lightning through your soul, empowering unarmed strikes and absorbing elemental energy.", features: [
      { level: 3, name: "Soulfire Initiate", text: "Bonus action: unarmed strikes deal +1d8 fire or lightning (increases to 1d10 at level 17)." },
      { level: 3, name: "Elemental Absorption", text: "Reaction: when targeted by a fire or lightning spell, absorb it — heal for half damage instead of taking it." },
      { level: 6, name: "Elemental Breath", text: "Fire Breath: action, 15-ft cone, Dex save, 10d8 fire. Lightning Breath: action, 30-ft line, Dex save, 10d8 lightning. Uses = Wisdom modifier per long rest." },
      { level: 11, name: "Soulfire Healing", text: "Action: absorb fire or lightning from environment, regain HP = 1d10 + monk level. Uses = Wisdom modifier per long rest." },
      { level: 17, name: "Soulfire Mastery", text: "All attacks ignore fire and lightning resistance; immunity treated as resistance. Focused Elemental Strike: melee hit deals +6d10 lightning; Con save or paralyzed 1 minute." }
    ], note: "" },
    { id: "oath-of-soul-destruction", name: "Oath of Soul Destruction", parentClass: "Paladin", priority: "highest", summary: "", features: [], note: "" },
    { id: "oath-of-godslayer", name: "Oath of the Godslayer", parentClass: "Paladin", summary: "Paladins sworn to Death itself, dedicated to destroying gods and freeing mortals from divine control.", features: [
      { level: 3, name: "Oath Spells", text: "Level 3: Inflict Wounds, Protection from Evil and Good. Level 5: Ray of Enfeeblement, Magic Weapon. Level 9: Vampiric Touch, Spirit Guardians. Level 13: Blight, Death Ward. Level 17: Destructive Wave, Anti-Life Shell." },
      { level: 3, name: "Channel Divinity: Mark of Mortality", text: "Action: curse creature within 30 ft for 1 minute. Can't regain HP; disadvantage on saves vs frightened/paralyzed; +1d8 necrotic from all sources (2d8 vs celestials)." },
      { level: 3, name: "Channel Divinity: Siphon Vitality", text: "Bonus action: creature within 30 ft with < half HP takes necrotic = 2x paladin level; you regain that HP." },
      { level: 7, name: "Aura of Dread", text: "10-ft aura (30 ft at 18th): celestials/divine have disadvantage on attacks vs creatures in aura; creatures starting turn in aura take necrotic = Cha modifier; you and allies gain radiant resistance." },
      { level: 15, name: "Relentless Mortal Will", text: "When reduced to 0 HP but not killed outright, drop to 1 HP instead. While at 1 HP, gain temp HP = Cha modifier (min 1) at start of each turn. Recharges on short or long rest." },
      { level: 17, name: "Oblivion's Smite", text: "Divine Smite option: deals necrotic, ignores resistance/immunity. +3d8 necrotic vs celestials/fiends; target Con save DC 8+PB+CHA or HP max reduced by smite damage until Greater Restoration." },
      { level: 20, name: "Death's Avatar", text: "1-minute transformation: immune to necrotic, attacks bypass necrotic resistance/immunity. Aura of Dread expands to 60 ft with Wisdom save or frightened; frightened creatures take 4d8 necrotic/turn. Oblivion's Smite grants temp HP = damage dealt. Once per long rest." }
    ], note: "" },
    { id: "oath-of-arcane", name: "Oath of the Arcane", parentClass: "Paladin", priority: "second", summary: "A paladin who swears to protect the weave of magic, balance arcane power, and inspire wonder in others.", features: [
      { level: 3, name: "Oath Spells", text: "Gain oath spells at listed levels; may also choose wizard spells for your spell list." },
      { level: 3, name: "Channel Divinity: Arcane Smite", text: "On hit with melee attack, deal 2d8 + Charisma modifier force damage." },
      { level: 3, name: "Channel Divinity: Spellbreaker", text: "Action: end one spell on yourself or one touched willing creature." },
      { level: 7, name: "Aura of Arcana", text: "You and allies within 10 ft have advantage on saves vs spells; 30 ft at 18th level." },
      { level: 15, name: "Arcane Mastery", text: "Cast any wizard spell of 4th level or lower without a spell slot once per long rest." },
      { level: 20, name: "Avatar of Magic", text: "1-minute transformation: resistance to spell damage; add Charisma modifier to paladin spell damage." }
    ], note: "" },
    { id: "oath-of-heavenly-flame", name: "Oath of Heavenly Flame", parentClass: "Paladin", summary: "Paladins who wield celestial flames to destroy evil and protect the innocent as living embodiments of divine fire.", features: [
      { level: 3, name: "Oath Spells", text: "Level 3: Burning Hands, Searing Smite. Level 5: Flame Blade, Scorching Ray. Level 9: Fireball, Beacon of Hope. Level 13: Wall of Fire, Death Ward. Level 17: Flame Strike, Holy Weapon." },
      { level: 3, name: "Channel Divinity: Blazing Smite", text: "Bonus action: infuse weapon with celestial flames 1 minute; next hit deals +3d8 fire; target Con save DC 8+PB+CHA or blinded until end of its next turn." },
      { level: 3, name: "Channel Divinity: Cleansing Flame", text: "Action: 20-ft radius Dex save; fail = 3d10+Cha fire; allies in area regain HP = Cha modifier." },
      { level: 7, name: "Aura of Heavenly Flame", text: "20-ft radius (30 ft at 18th): hostile creatures take fire = Cha modifier at turn start; allies gain fire resistance and advantage vs frightened." },
      { level: 15, name: "Inferno Vanguard", text: "Firebrand Smite: on hit deal +6d8 fire; flames leap to creature within 10 ft for half damage on kill. Flames of Renewal: regain HP = half fire damage dealt, once per turn. Unstoppable Flames: fire ignores resistance, treats immunity as resistance." },
      { level: 20, name: "Avatar of the Heavenly Flame", text: "Action, 1-minute: +3d8 fire on all attacks; Infernal Burst bonus action (30-ft Dex save, 6d10 fire on fail); you and allies within 30 ft immune to fire. Once per long rest." }
    ], note: "" },
    { id: "oath-of-renewal", name: "Oath of Renewal", parentClass: "Paladin", summary: "Paladins of Renewal serve dawn deities like Lathander. NEXUS's oath. Focuses on healing, redemption, and reclaiming the lost.", features: [
      { level: 3, name: "Tenets of Renewal", text: "Bring light to the fallen. Offer the chance to return. Strike only when redemption is refused." }
    ], note: "Full subclass text in Oath_of_Renewal.txt — to be expanded." },
    { id: "oath-of-necrosis", name: "Oath of Necrosis", parentClass: "Paladin", summary: "", features: [], note: "" },
    { id: "head-hunter", name: "Head Hunter", parentClass: "Ranger", priority: "highest", summary: "A ranger specialized in tracking, stealth, and high-damage ranged precision attacks.", features: [
      { level: 3, name: "Shadow Tracker", text: "Gain Investigation and Stealth proficiency; track any creature type; sense presence of creatures within 1 mile." },
      { level: 3, name: "Twin Shot", text: "When taking Attack action with ranged weapon, shoot two arrows; make two attack rolls, each deals normal damage." },
      { level: 7, name: "Veil of Shadows", text: "Action: invisible 1 minute, advantage on attacks, enemies have disadvantage against you. Recharge on short or long rest." },
      { level: 11, name: "Deadly Precision", text: "Attacks against tracked creatures deal +1d8 damage. If you have advantage on an attack roll, you may reroll one die once." },
      { level: 15, name: "Multi-Arrow Mastery", text: "Twin Shot fires 3 arrows; three attack rolls, each deals normal damage. Arrows ignore nonmagical resistance." },
      { level: 18, name: "Assassin's Strike", text: "Hitting a surprised creature is an automatic critical hit. Add Wisdom modifier to damage of this attack." }
    ], note: "" },
    { id: "shadowy-arrow", name: "The Shadowy Arrow", parentClass: "Ranger", summary: "A shadow-wielding archer who summons a necrotic bow and debilitates enemies from darkness.", features: [
      { level: 3, name: "Shadow Bow", text: "Bonus action: summon magical Shadow Bow dealing necrotic damage. On hit, target Con save DC 8+PB+WIS or disadvantage on next attack roll. Bow vanishes if more than 5 ft away for 1 minute." },
      { level: 3, name: "Lurking in Shadows", text: "Gain Stealth proficiency; Hide as bonus action; add WIS modifier to Stealth checks in dim light or darkness." },
      { level: 7, name: "Dark Empowerment", text: "Shadow Bow range +40 ft. Once per turn on hit, apply one debuff: disadvantage on saves, -10 ft speed, blinded (Con save), or 1d8 necrotic at start of target's next turn." },
      { level: 11, name: "Shadow Strike", text: "Hitting while hidden deals +2d10 necrotic. Reaction after attacking: teleport within 30 ft to dim light or darkness." },
      { level: 15, name: "Master of Shadows", text: "Shadow Bow deals +1d12 necrotic. On hit, apply two debuffs instead of one. Shadow Bow ignores resistance; treats immunity as resistance." }
    ], note: "Glass of Dusk's subclass. Full text in The_Shadowy_Arrow.txt — to be expanded." },
    { id: "deity-hunter", name: "Deity Hunter", parentClass: "Ranger", summary: "A ranger who hunts divine beings, piercing celestial defenses and turning divine powers against oppressive gods.", features: [
      { level: 3, name: "Divine Nemesis", text: "Choose Celestials, Fiends, or Aberrations; gain tracking advantage and +2d6 (4d6 at 11th) radiant/necrotic damage against them." },
      { level: 3, name: "Sacred Sight", text: "Cast Detect Evil and Good at will; darkvision 120 ft; see through magical darkness, invisibility, and illusions." },
      { level: 7, name: "Divine Resistance", text: "Resistance to radiant/necrotic; immune to charm/fright from chosen type. Reaction grants advantage on saves. Uses = proficiency bonus per long rest." },
      { level: 11, name: "Vengeful Strike", text: "On hit vs chosen type, force Con save DC 8+PB+WIS; fail = stunned until end of your next turn + 3d6 psychic. Uses = Wisdom modifier (min 1) per short or long rest." },
      { level: 15, name: "Godslayer's Fury", text: "On hit vs chosen type, deal +10d6 radiant or necrotic. If reduced to 0 HP: utterly annihilated, no resurrection < Wish. Divine Fear: chosen-type creatures within 30 ft Wisdom save or frightened 1 minute. Once per long rest." }
    ], note: "" },
    { id: "venomous-hunter", name: "Venomous Hunter", parentClass: "Ranger", summary: "A ranger who coats arrows in poison, marks prey for death, and enchants ammunition with elemental magic.", features: [
      { level: 3, name: "Poisoned Arrows", text: "Bonus action: coat ammo in poison for 1 minute or until hit. +1d6 poison damage (2d6 at 11th, 3d6 at 15th)." },
      { level: 3, name: "Marked for Death", text: "Bonus action: mark creature within 90 ft for 1 minute. Advantage on attacks, +1d4 damage against it. Uses = Wisdom modifier (min 1), long rest." },
      { level: 7, name: "Enchanted Arrows", text: "After long rest, choose enchantment for arrows = Wisdom modifier: Flaming +1d6 fire; Frost +1d6 cold, -10 ft speed; Thunder +1d6 thunder, Str save or pushed 10 ft." },
      { level: 11, name: "Deadly Precision", text: "Critical hit range with ranged attacks increases by 1. On crit, roll one additional weapon damage die." },
      { level: 15, name: "Master Poisoner", text: "Create special poison once per long rest: 6d6 poison + poisoned 1 minute (Con save at end of each turn to end). Poisoned Arrows ignores poison resistance." }
    ], note: "" },
    { id: "surgeon-of-shadows", name: "Surgeon of Shadows", parentClass: "Rogue", priority: "highest", summary: "A rogue who masters anatomical precision to debilitate, paralyze, and defeat foes with targeted strikes.", features: [
      { level: 3, name: "Precise Striker", text: "On Sneak Attack, apply one effect: Hamstring Strike (halve speed), Disarming Blow (Str save DC 8+DEX+PB or drop item), or Weakening Wound (disadvantage on next Str attack/check). Uses = Dex modifier, recharge short or long rest." },
      { level: 9, name: "Anatomical Insight", text: "Gain Medicine proficiency and expertise. On critical hit, choose to stun target until end of your next turn. Once per turn, deal +1d4 x INT modifier additional damage. Uses = half rogue level." },
      { level: 13, name: "Paralyzing Precision", text: "When dealing Sneak Attack damage, make target paralyzed until end of your next turn: Con save DC 8+DEX+PB; success = stunned instead. Once per long rest." },
      { level: 17, name: "Master of Nerve Strikes", text: "Apply two effects from Precise Striker on one Sneak Attack. Paralyzing Precision can affect a second target within 5 ft. Six times per long rest: on Sneak Attack hit, target incapacitated 1 minute (Con save at end of each turn to end)." }
    ], note: "" },
    { id: "reaper-of-souls", name: "Reaper of Souls", parentClass: "Rogue", priority: "second", summary: "A rogue who harvests souls of slain enemies to gain temporary hit points and necrotic power.", features: [
      { level: 3, name: "Soul Reaper", text: "On kill with melee, harvest soul: gain temp HP = Rogue level + Dex modifier; proficiency with scythes (finesse)." },
      { level: 9, name: "Death's Embrace", text: "Reaction: expend harvested soul to reduce damage by 2x Rogue level. Uses = proficiency bonus per long rest." },
      { level: 13, name: "Phantom Strike", text: "Attacks with advantage deal extra necrotic = Rogue level. Killing blow restores one Death's Embrace use." },
      { level: 17, name: "Grim Harvest", text: "On melee kill, reap soul and take an extra turn with advantage on attacks and no opportunity attacks provoked. Once per long rest." }
    ], note: "" },
    { id: "divine-slayer", name: "Divine Slayer", parentClass: "Rogue", summary: "Rogues who specialize in hunting and destroying divine beings, bypassing celestial resistances and empowering strikes with radiant or necrotic energy.", features: [
      { level: 3, name: "Divine Nemesis", text: "Sneak Attack deals +1d6 radiant/necrotic (2d6 at 9th, 3d6 at 13th, 4d6 at 17th); attacks bypass non-magical resistance." },
      { level: 3, name: "Divine Scent", text: "Gain Religion proficiency; add Intelligence modifier x2 to checks about celestial or divine entities." },
      { level: 9, name: "Divine Defiance", text: "Resistance to radiant and necrotic. Reaction when creature within 30 ft deals radiant/necrotic to you: force Wisdom save; fail = take radiant or necrotic = half rogue level + Dex modifier." },
      { level: 13, name: "Bane of the Divine", text: "When dealing Sneak Attack damage, apply Divine Bane: prevents target from using legendary actions or legendary resistances until start of your next turn. 3 times per short or long rest." },
      { level: 17, name: "Slayer's Ascension", text: "On Sneak Attack hit, deal +6d10 radiant or necrotic; target Con save or stunned until end of your next turn. Mark of the Divine Slayer: bonus action, mark creature within 60 ft for 1 minute — advantage on attacks, Sneak Attack ignores immunity. Once per long rest each." }
    ], note: "Listed in source doc as 'Archetype of the God Slayer.'" },
    { id: "shinobi-blade", name: "The Shinobi's Blade", parentClass: "Rogue", summary: "A rogue archetype wielding a soul-bound magical blade with lightning and arcane abilities inspired by legendary shinobi warriors.", features: [
      { level: 3, name: "Shinobi's Blade", text: "Gain a magical finesse blade (katana, kunai, or similar) dealing 1d6 slashing. Bolted Strike: once per round on hit, deal +1d6 lightning (2d6 at 9th, 3d6 at 17th)." },
      { level: 3, name: "Shinobi's Grace", text: "Uncanny Reflexes: reaction to attacker roll vs you — move half speed and impose disadvantage; if attack misses, move full speed." },
      { level: 9, name: "Shadow Step", text: "Bonus action: teleport up to 30 ft to visible space; attacks against you have disadvantage until start of your next turn. Uses = Dex modifier (min 1), long rest." },
      { level: 9, name: "Extra Attack", text: "You can attack twice instead of once when taking the Attack action." },
      { level: 13, name: "Raiton Surge", text: "Tento Burst: action, charge blade; next hit deals +4d6 lightning + Con save or paralyzed. Lightning Dash: when using Shadow Step, appear in burst dealing 1d8 to creatures within 5 ft." },
      { level: 17, name: "Perfected Shinobi's Grace", text: "Ethereal Dodge — feature text cut off in source document. NEEDS MANUAL REVIEW." }
    ], note: "Level 17 Ethereal Dodge text cut off — requires manual completion." },
    { id: "the-vanir", name: "The Vanir", parentClass: "Rogue", summary: "Vanir rogues combine stealth, trickery, and magic using Mischief Dice and teleportation to strike unpredictably.", features: [
      { level: 3, name: "Mischief Dice", text: "Pool of d6s = proficiency bonus + Dex modifier; expend one on hit for random effect (1=disadvantage on next attack, 2=3d6 psychic, 3=Str save or prone, 4=rune giving next attacker advantage, 5=3d6 fire to 5-ft radius, 6=temp HP = roll+Cha); recharge on long rest." },
      { level: 3, name: "Two-Weapon Fighting Mastery", text: "Add Dex modifier to damage rolls of both attacks." },
      { level: 6, name: "Blink Strike", text: "Bonus action: throw a weapon at creature within 30 ft; on hit, teleport to weapon's location and make one additional melee attack with advantage. Uses = proficiency bonus per long rest." },
      { level: 9, name: "Enhanced Mischief Dice", text: "Mischief Die effects amplified: damage effects deal +1d6; non-damage effects strengthened." },
      { level: 13, name: "Shadowstep Ambush", text: "Action: teleport to visible location within 60 ft; make melee attack for +3d6 force with advantage. Reaction: teleport 30 ft when creature within 5 ft misses you, then attack if in reach. Uses = proficiency bonus per long rest." },
      { level: 17, name: "Mischief Incarnate", text: "Mischief Dice become d8s; roll two and choose. Vanir's Wrath: teleport to up to 6 creatures within 30 ft, making melee attack vs each for +3d10 force, then teleport back. Once per long rest." }
    ], note: "" },
    { id: "divine-wrath", name: "Divine Wrath Origin", parentClass: "Sorcerer", summary: "Sorcerers marked by divine judgment wield radiant or necrotic fury to defy and overthrow celestial powers.", features: [
      { level: 1, name: "Divine Defiance", text: "Resistance to radiant and necrotic; reaction to add Charisma modifier to saves vs charm/frighten; advantage if source is celestial or deity-granted." },
      { level: 1, name: "Wrathful Smite", text: "Spend 1 sorcery point to add Charisma modifier as radiant or necrotic to spells hitting celestials; ignores resistance/immunity." },
      { level: 6, name: "Divine Spell Rebellion", text: "Reaction + 2 sorcery points: cleric/paladin spell within 30 ft; caster Charisma save or spell fizzles, granting you temp HP = twice spell's level." },
      { level: 14, name: "Unholy Aura", text: "Bonus action, 1-minute aura 10 ft: allies gain radiant/necrotic resistance; celestials Cha save DC 8+prof+CHA or disadvantage on attacks. Uses = proficiency bonus per long rest." },
      { level: 18, name: "God-Slaying Wrath", text: "Action, 5 sorcery points: celestial/divine caster within 60 ft Con save DC 8+prof+CHA; fail = 10d10 radiant or necrotic + stunned. Once per long rest." }
    ], note: "" },
    { id: "lichs-curse", name: "The Lich's Curse", parentClass: "Sorcerer", summary: "", features: [], note: "" },
    { id: "death-knights-curse", name: "Death Knight's Curse", parentClass: "Sorcerer", summary: "", features: [], note: "" },
    { id: "voidborn", name: "Voidborn", parentClass: "Sorcerer", summary: "Voidborn Sorcerers channel chaotic Void energy to manipulate reality, convert damage types, and trigger unpredictable Void Surges.", features: [
      { level: 1, name: "Void Infusion", text: "Gain eldritch blast cantrip (sorcerer slot, free); convert spell damage to force/psychic; resistance to force damage." },
      { level: 1, name: "Rift Step", text: "Bonus action: teleport up to 15 ft to visible space, no opportunity attacks. Uses = proficiency bonus per long rest." },
      { level: 1, name: "Void Surges", text: "When casting 1st+ level spell, roll d4; on 3-4, roll d20 for one of 20 Void Surge effects (range: temp HP to spells to fear aura to force damage)." },
      { level: 1, name: "Rift Magic", text: "Always prepared: 1st Dissonant Whispers, Arms of Hadar; 3rd Mirror Image, Misty Step; 5th Counterspell, Hunger of Hadar; 7th Dimension Door, Phantasmal Killer; 9th Wall of Force, Synaptic Static." },
      { level: 6, name: "Void's Grasp", text: "When you hit with spell attack or force a save, tether target: speed halved, teleport/plane shift requires Cha save vs spell DC or fails. Uses = proficiency bonus per long rest." },
      { level: 6, name: "Unseen Spell", text: "Action: cast spell through Void; spell attacks have advantage (+1d10 force); saving throw spells imposed with disadvantage. Uses = proficiency bonus per long rest." },
      { level: 14, name: "Eclipse of the Rift", text: "Reaction when hit or fail a save: vanish into Void and reappear within 60 ft; resistance to all damage except psychic until start of your next turn. Uses = proficiency bonus per long rest." },
      { level: 18, name: "Devour Reality", text: "Action, concentration 1 minute: 20-ft radius sphere of Void energy within 120 ft. Creatures make Con save or take 10d10 force (half on success); area heavily obscured. Once per long rest." },
      { level: 18, name: "Greater Void Surges", text: "Void Surges trigger on d4 roll of 2-4 (was 3-4) and use a d100 (100 effects) instead of d20." }
    ], note: "" },
    { id: "void-guardian", name: "Void Guardian", parentClass: "TeliKin", summary: "Void Guardians use Void energy to protect allies, evade attacks, and create spectral barriers.", features: [
      { level: 3, name: "Defensive Reposition", text: "Reaction: teleport up to 30 ft to visible space when targeted by attack, no opportunity attacks. Uses = Intelligence modifier (min 1), long rest." },
      { level: 6, name: "Void Armor", text: "Bonus action: +2 AC and resistance to nonmagical B/P/S for 1 minute. On ranged miss, roll d20; on 16+, redirect attack to creature within 30 ft. Once per short or long rest." },
      { level: 10, name: "Shield Wall", text: "Action: spectral wall up to 30 ft long, 10 ft high, 5 ft thick within 60 ft — three-quarters cover for 1 minute. Creatures passing through Str save vs spell DC or speed reduced to 0. Once per long rest." },
      { level: 14, name: "Guardian's Resolve", text: "Reaction when you or ally within 10 ft takes damage: reduce it by Intelligence modifier + half TeliKin level. Uses = proficiency bonus per long rest." },
      { level: 18, name: "Bastion of Shields", text: "Action: 15-ft radius sphere centered on you, moves with you, lasts 1 minute. You and allies inside gain resistance to all damage except psychic, advantage on saves vs multi-target effects. Once per long rest." }
    ], note: "" },
    { id: "void-clasher", name: "Void Clasher", parentClass: "TeliKin", summary: "A teleportation-focused subclass that strikes from multiple angles using Void portals, illusions, and rapid blinks.", features: [
      { level: 3, name: "Void Rush", text: "Teleport up to 10 ft before/after attacks; grants advantage if teleporting before. Uses = Intelligence modifier, long rest." },
      { level: 6, name: "Phantom Assault", text: "Summon two spectral images within 10 ft for 1 minute; enemies have disadvantage on opportunity attacks and attacks if image within 5 ft. Once per long rest." },
      { level: 10, name: "Defensive Blink", text: "Reaction: impose disadvantage on an attack roll by teleporting; if it misses, teleport up to 15 ft and regain one Void Rush use." },
      { level: 14, name: "Cascade of Blades", text: "Make attacks = half Intelligence modifier (min 1) with advantage, dealing force damage; teleport 10 ft after each attack. Once per long rest." },
      { level: 18, name: "Shadow Slip", text: "Use Void Rush as bonus action without expending a use; Dodge as bonus action after Void Rush; missed melee attackers take force = Intelligence modifier." }
    ], note: "" },
    { id: "telikin-of-vigilance", name: "Vigilance", parentClass: "TeliKin", summary: "Seers of the Void who gain supernatural foresight, immunity to surprise, and precognitive combat abilities.", features: [
      { level: 3, name: "Void Sight", text: "See through walls, darkness, invisibility within 60 ft; immune to flanking/surprise. Range increases to 120 ft at 10th, 300 ft at 18th." },
      { level: 6, name: "Precognition", text: "Gain advantage on one attack/save/check or impose disadvantage on one attack targeting you. Uses = Intelligence modifier (min 1), long rest." },
      { level: 10, name: "Foresight Strike", text: "When attacking, make one extra weapon attack with advantage; on hit, deals +3d8 psychic damage." },
      { level: 14, name: "Glimpse the Tides", text: "Action: grant self or ally within 30 ft advantage on next 5 attack rolls/saves, or impose disadvantage on next 5 attacks targeting them." },
      { level: 18, name: "Void Perception", text: "Feature text cut off in source document. NEEDS MANUAL REVIEW." }
    ], note: "Listed in the subclasses reference doc as 'TeliKin of Vigilance.' Level 18 Void Perception requires manual completion." },
    { id: "pact-of-godslayer", name: "Pact of the Godslayer", parentClass: "Warlock", summary: "A warlock who forged a pact with an ancient god-slaying force, gaining power to resist and destroy divine beings.", features: [
      { level: 1, name: "Expanded Spell List", text: "Level 1: Divine Favor, Protection from Evil and Good. Level 2: Magic Weapon, Zone of Truth. Level 3: Dispel Magic, Crusader's Mantle. Level 4: Freedom of Movement, Guardian of Faith. Level 5: Dispel Evil and Good, Holy Weapon." },
      { level: 1, name: "Divine Defiance", text: "Resistance to radiant damage. Reaction when creature within 30 ft deals radiant/necrotic to you: force Wisdom save DC 8+CHA+PB; fail = take damage = half warlock level + CHA modifier." },
      { level: 1, name: "Physical Defiance", text: "Proficiency in simple and martial weapons; use Charisma instead of Strength or Dexterity for damage." },
      { level: 6, name: "God Slayer's Strike", text: "Once per turn on hit, deal +2d8 radiant/necrotic; celestials Con save or can't regain HP until your next turn. Uses = proficiency bonus per long rest." },
      { level: 10, name: "Shield of Defiance", text: "Immunity to charm/fright from celestials. Reaction when creature within 30 ft uses legendary action or resistance: Wisdom save vs spell save DC or action/resistance negated." },
      { level: 14, name: "Divine Banishment", text: "Action: celestial/divine creature within 60 ft Charisma save vs spell DC; fail = banished 1 minute; success = 6d10 radiant or necrotic + stunned. Once per long rest." }
    ], note: "" },
    { id: "pact-of-vampirism", name: "Pact of Vampirism", parentClass: "Warlock", summary: "", features: [], note: "" },
    { id: "pact-of-evalune", name: "Pact of the Evalune", parentClass: "Warlock", summary: "", features: [], note: "" },
    { id: "infernal-summoner", name: "Infernal Summoner", parentClass: "Warlock", summary: "", features: [], note: "NEEDS CLARIFICATION: This entry was carried over from earlier compendium drafts but was not found in the subclasses reference doc. Possibly Abel's unique class rather than a standard Warlock subclass — confirm and recategorize if needed." },
    { id: "school-of-desecration", name: "School of Desecration", parentClass: "Wizard", summary: "Wizards who unravel divine magic, disrupt celestial power, and seek to purge the Weave of godly influence.", features: [
      { level: 2, name: "Desecrator's Insight", text: "Gain Religion proficiency and expertise; detect celestials/fiends/undead and divine spells within 60 ft. Uses = proficiency bonus per long rest." },
      { level: 2, name: "Anti-Divine Ward", text: "Cast Protection from Evil and Good without spell slot, self only, no concentration, 10 min. Uses = Intelligence modifier (min 1) per long rest." },
      { level: 6, name: "Unravel Divinity", text: "Reaction: when creature makes divine spell/feature check, force Wisdom save or it's negated. Uses = proficiency bonus per long rest." },
      { level: 10, name: "Desecrate the Divine", text: "Action: 30-ft sphere desecrated 1 minute. No divine healing; divine spells 5th level or lower require Wisdom save or fail. Once per long rest." },
      { level: 14, name: "Godslayer's Mastery", text: "Action: celestial/divine caster within 60 ft Con save or loses all spellcasting and divine features for 1 minute. You gain temp HP = wizard level + INT modifier and advantage on attacks/saves vs that target. Once per long rest." }
    ], note: "" },
    { id: "school-of-vacuus", name: "School of Vacuus", parentClass: "Wizard", summary: "Wizards who master Void energy to manipulate, disrupt, and control enemies using reality-warping forces.", features: [
      { level: 2, name: "Void Knowledge", text: "Change damage type of spells to force or psychic. Void Lashes cantrip: 1d12 force/psychic (Dex save, half on success), scaling to 4d12 at 17th level, splittable across targets." }
    ], note: "Disruptive Presence benefit of Void Knowledge is cut off in source document. NEEDS MANUAL REVIEW." },
    { id: "school-of-prismatics", name: "School of Prismatics", parentClass: "Wizard", summary: "A wizard subclass that harnesses prismatic magic to deal multi-colored damage and create protective barriers.", features: [
      { level: 2, name: "Prismatic Savant", text: "Copying evocation or abjuration spells costs one-quarter normal. Learn Chromatic Orb (doesn't count against prepared spells)." },
      { level: 2, name: "Enhanced Prismatic Prism", text: "Bonus action: create a magical prism within 60 ft that lasts 1 minute; up to three prisms active at once. Full usage options cut off in source document." },
      { level: 14, name: "Enhanced Prismatic Beam", text: "Prismatic Beam deals +3d8 damage of any two chosen types (acid, cold, fire, lightning, poison, or radiant)." },
      { level: 14, name: "Prismatic Barrier Immunity", text: "Prismatic Radiance can grant immunity to two chosen damage types instead of resistance." },
      { level: 14, name: "Living Prism", text: "Once per day: transform into Living Prism for 1 minute — use Prismatic Beam as bonus action, gain resistance to all damage." }
    ], note: "Enhanced Prismatic Prism usage options cut off in source document. NEEDS MANUAL REVIEW." },
    { id: "bladebinder", name: "Bladebinder", parentClass: "Wizard", summary: "", features: [], note: "Originally a Wizard subclass; may be in the process of becoming its own class — confirm and recategorize if needed." },
    { id: "god-eater", name: "God Eater", parentClass: "Esper", summary: "Psionic warriors who hunt divine entities, disrupting their powers and draining mental acuity.", features: [
      { level: 3, name: "Divine Disruption", text: "Bonus action: target within 60 ft loses Resistances, Immunities, Legendary Actions, or Innate Spellcasting until end of its next turn. DC 8+PB+INT; divine creatures have disadvantage. Uses = proficiency bonus per long rest." },
      { level: 3, name: "Psionic Memory Drain", text: "Reaction: target within 30 ft INT save DC 8+PB+INT or lose 1d6 from roll; you gain 2x that as temp HP. Increases to 1d8 at 10th. Uses = INT modifier per long rest." },
      { level: 6, name: "Divine Amnesia", text: "Action: target within 60 ft WIS save DC 8+PB+INT or forgets one ability, spell, or action until end of your next turn." }
    ], note: "" },
    { id: "deity-nightmare", name: "Deity Nightmare", parentClass: "Esper", summary: "", features: [], note: "" },
    { id: "eye-of-eternity", name: "Eye of Eternity", parentClass: "Esper", summary: "", features: [], note: "" },
    { id: "order-of-mender", name: "Order of the Mender", parentClass: "Esper", summary: "A healer-empath subclass that mends wounds and minds while manipulating emotions on the battlefield.", features: [
      { level: 3, name: "Pulse of Relief", text: "Bonus action, expend 1 ESP die; target within 30 ft regains HP = die + INT modifier, plus temp HP = half Esper level; ends frightened/charmed conditions." },
      { level: 5, name: "Empathic Reversal", text: "Reaction: expend 1 ESP die to redirect emotion condition to new target within 60 ft; WIS save or suffer same condition." },
      { level: 7, name: "Sympathetic Link", text: "Action, expend 1 ESP die; link with willing creature within 30 ft for 1 minute; split damage, redirect healing." },
      { level: 9, name: "Echo of Empathy", text: "When casting psionic healing on a creature, expend 1 ESP die to echo healing to another target within 30 ft." },
      { level: 11, name: "Laughter of the Damned", text: "When creature fails save vs your emotion effect, expend 1 ESP die; it laughs/sobs/shrieks uncontrollably; creatures within 10 ft WIS save or also affected." },
      { level: 13, name: "Surge of Serenity", text: "Action, 2 ESP dice, 30-ft Charisma save. Allies: calm emotions + remove one negative condition. Enemies: disadvantage on next saving throw." },
      { level: 15, name: "Soul Stitcher", text: "Reaction when creature within 60 ft drops to 0 HP, expend 2 ESP dice; restore to consciousness with HP = sum of dice + INT modifier." }
    ], note: "" },
    { id: "mind-ravager", name: "Mind Ravager", parentClass: "Esper", summary: "A psion who transfers their consciousness between bodies, wielding their mind as a weapon.", features: [
      { level: 3, name: "Thought Transfer", text: "Action: dominate creature within 30 ft, INT save DC 8+PB+INT mod, control up to 1 minute; your body unconscious. One creature at a time. Once per long rest if target succeeds." },
      { level: 3, name: "Force Darts", text: "Action: shoot proficiency bonus darts, each 1d8 force, 60 ft range, bypass cover except full. Recharge on short or long rest." },
      { level: 6, name: "Mind Ravage", text: "Reaction on reducing creature to 0 HP: contested INT save series (first to 5 wins). Win = permanently transfer consciousness. Lose = become floating orb (20 ft hover, immunity to nonmagical attacks, Force Darts only)." },
      { level: 10, name: "Conscious Instinct", text: "Resistance to psychic; advantage vs charm/fright. When creature reads your thoughts, force INT save; fail = 2d10 psychic and effect fails." },
      { level: 14, name: "Dominance Unleashed", text: "Action: 30-ft radius INT save DC 8+PB+INT; fail = stunned 1 minute (save repeats end of turn). Once per long rest." }
    ], note: "" },
    { id: "hidden-hand", name: "The Hidden Hand", parentClass: "Esper", summary: "", features: [], note: "" },
    { id: "psionic-executioner", name: "Psionic Executioner", parentClass: "Esper", summary: "A duelist who slows targets and locks minds, finishing them with overwhelming psychic precision.", features: [
      { level: 3, name: "Executioner's Arc", text: "Action, 1 ESP die: 15-ft cone, DEX save. Fail: ESP die + INT mod psychic damage, speed reduced 10 ft until end of next turn. Success: half, no slow." },
      { level: 3, name: "Mind Lock", text: "Initiate a contested mental duel with a target. (See full doc.)" },
      { level: 5, name: "Mind Spike Cleave", text: "On melee hit, 1 ESP die: INT save. Fail: dazed until start of your next turn. Disadvantage if already in Mind Lock." },
      { level: 7, name: "Psionic Pulse Slash", text: "Action, 2 ESP dice: 30-ft line. CON save. Fail: dice + INT mod psychic damage, knocked prone." },
      { level: 9, name: "Mental Rupture Step", text: "Move 10+ ft in a line then hit: 1 ESP die — WIS save. Fail: 1d6 INT damage and disadvantage on INT saves for 1 min." },
      { level: 11, name: "Crushing Duelist's Will", text: "While in Mind Lock, start of turn, 1 ESP die: add die to INT contest; deal INT mod psychic damage regardless." },
      { level: 13, name: "Echo of the Guillotine", text: "When you drop a creature with melee, 1 ESP die: another within 15 ft makes CHA save or frightened + ESP die damage." },
      { level: 15, name: "Paralyzing Execution", text: "On crit or kill with melee: use Paralyzing Stare free." }
    ], note: "Full Mind Lock subsystem, victory effects, and Broken Resistance rider in Psionic_Executioner_v2.docx." },
    { id: "eidolon-invoker", name: "Invoker", parentClass: "Eidolon", summary: "", features: [], note: "" },
    { id: "eidolon-warrior", name: "Warrior", parentClass: "Eidolon", summary: "", features: [], note: "" },
    { id: "radiant-wave-gensarch", name: "Radiant Wave", parentClass: "Gensarch", summary: "A support-focused subclass that uses Genn Dice to heal allies and restore HP to multiple creatures.", features: [
      { level: 3, name: "Healing Flow", text: "Use a Genn Die to heal a creature within 30 ft: HP = die roll + Wisdom modifier." },
      { level: 7, name: "Rejuvenating Tide", text: "Bonus action: spend a Genn Die to heal up to 3 creatures within 15 ft. Uses = proficiency bonus per long rest." },
      { level: 11, name: "Purifying Current", text: "Allies you heal gain advantage on their next saving throw and 1d6 temp HP." },
      { level: 15, name: "Overflow", text: "Once per long rest: when healing with a Genn Die, duplicate the effect to a second creature within 30 ft at no cost." }
    ], note: "Water Gensarch sub-path." },
    { id: "elamesta", name: "Elamesta", parentClass: "Gensarch", summary: "", features: [], note: "" },
    { id: "void-striker", name: "The Void Striker", parentClass: "TeliKin", summary: "", features: [], note: "" },
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
      // Merge classes — preserve user-edited fields, keep structural defaults
      const cachedClassesById = {};
      (cached.classes || []).forEach((c) => { cachedClassesById[c.id] = c; });
      const mergedClasses = DEFAULT_CONTENT.classes.map((defaultCls) => {
        const cachedCls = cachedClassesById[defaultCls.id];
        if (!cachedCls) return defaultCls;
        const preserve = (field) => cachedCls[field] && (Array.isArray(cachedCls[field]) ? cachedCls[field].length > 0 : cachedCls[field] !== "");
        return {
          ...defaultCls,
          summary: preserve('summary') ? cachedCls.summary : defaultCls.summary,
          coreFeatures: preserve('coreFeatures') ? cachedCls.coreFeatures : defaultCls.coreFeatures,
          progression: preserve('progression') ? cachedCls.progression : defaultCls.progression,
          startingHP: preserve('startingHP') ? cachedCls.startingHP : defaultCls.startingHP,
          hpPerLevel: preserve('hpPerLevel') ? cachedCls.hpPerLevel : defaultCls.hpPerLevel,
          armorTraining: preserve('armorTraining') ? cachedCls.armorTraining : defaultCls.armorTraining,
          savingThrows: preserve('savingThrows') ? cachedCls.savingThrows : defaultCls.savingThrows,
          skills: preserve('skills') ? cachedCls.skills : defaultCls.skills,
          weapons: preserve('weapons') ? cachedCls.weapons : defaultCls.weapons,
          startingEquipment: preserve('startingEquipment') ? cachedCls.startingEquipment : defaultCls.startingEquipment,
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

  const isSubrace = race.parentRace && !race.isParent && race.parentRace !== race.name;
  const isEmpty = !race.description && !race.summary && (!race.traits || race.traits.length === 0);

  return (
    <div>
      <h1 style={styles.pageHeading}>{race.name}</h1>
      {isSubrace && <div style={{ marginBottom: '14px' }}><span style={styles.pill}>{race.parentRace} Subrace</span></div>}

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

      <h2 style={styles.sectionHeading}>Traits</h2>
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

      {race.isParent && (() => {
        const subraces = content.races.filter((r) => r.parentRace === race.parentRace && !r.isParent);
        if (subraces.length === 0) return null;
        return (
          <>
            <h2 style={styles.sectionHeading}>Subraces</h2>
            {subraces.map((sr) => (
              <div key={sr.id} style={styles.featureCard}>
                <div style={styles.featureName}>{sr.name}</div>
                {sr.summary ? <p style={{ ...styles.bodyText, margin: 0 }}>{sr.summary}</p>
                  : <p style={{ ...styles.bodyText, margin: 0, fontStyle: 'italic', color: '#8b6914' }}>Not yet written.</p>}
              </div>
            ))}
          </>
        );
      })()}

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

  return (
    <div>
      <h1 style={styles.pageHeading}>{cls.name}</h1>
      <div style={{ marginBottom: '14px' }}>
        {cls.hitDie && <span style={styles.pill}>Hit Die: {cls.hitDie}</span>}
        {cls.primary && <span style={styles.pill}>Primary: {cls.primary}</span>}
      </div>

      {editMode ? (
        <textarea style={{ ...styles.textarea, minHeight: '80px', marginBottom: '16px' }} value={cls.summary || ''}
          placeholder="Class overview…" onChange={(e) => updateCls({ summary: e.target.value })} />
      ) : cls.summary ? (
        <p style={{ ...styles.bodyText, marginBottom: '20px' }}>{cls.summary}</p>
      ) : null}

      {/* ── Hit Points & Starting Info ── */}
      <h2 style={styles.sectionHeading}>Hit Points & Starting Info</h2>
      <div style={{ ...styles.card, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
        {infoField('Hit Points at 1st Level', 'startingHP', 'e.g. 10 + CON modifier')}
        {infoField('Hit Points per Level', 'hpPerLevel', 'e.g. 6 + CON modifier per level after 1st')}
        {infoField('Armor Training', 'armorTraining', 'e.g. Light Armor, Medium Armor, Shields')}
        {infoField('Saving Throws', 'savingThrows', 'e.g. Strength, Constitution')}
        {infoField('Skill Proficiencies', 'skills', 'e.g. Choose 2 from...')}
        {infoField('Weapon Proficiencies', 'weapons', 'e.g. Simple and Martial Weapons')}
        {infoField('Starting Equipment', 'startingEquipment', 'Starting equipment choices...')}
      </div>

      {/* ── Class Table ── */}
      <h2 style={styles.sectionHeading}>Class Table</h2>
      {hasProgression ? (
        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: '"Palatino Linotype", serif', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#5c1414', color: '#f5ecd9' }}>
                {cols.map((col, i) => (
                  <th key={i} style={{ padding: '8px 12px', textAlign: i === 0 ? 'center' : 'left',
                    fontFamily: '"Cinzel", serif', fontSize: '11px', letterSpacing: '0.06em', fontWeight: 600 }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cls.progression.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,250,240,0.8)' : 'rgba(201,165,92,0.15)',
                  borderBottom: '1px solid rgba(139,105,20,0.15)' }}>
                  <td style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 600, color: '#5c1414' }}>{row.level}</td>
                  {row.col2 !== undefined && <td style={{ padding: '6px 12px' }}>{row.col2}</td>}
                  {row.col3 !== undefined && <td style={{ padding: '6px 12px' }}>{row.col3}</td>}
                  {row.col4 !== undefined && <td style={{ padding: '6px 12px' }}>{row.col4}</td>}
                  {row.col5 !== undefined && <td style={{ padding: '6px 12px' }}>{row.col5}</td>}
                  <td style={{ padding: '6px 12px', color: '#3b2615' }}>{row.features}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ ...styles.card, background: 'rgba(201, 165, 92, 0.15)', borderColor: '#c9a55c', marginBottom: '20px' }}>
          <p style={{ ...styles.bodyText, margin: 0, fontStyle: 'italic' }}>Class table not yet filled in.</p>
        </div>
      )}

      {/* ── Core Features ── */}
      <h2 style={styles.sectionHeading}>Core Features</h2>
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

      {cls.notes && (
        <div style={{ ...styles.card, marginTop: '20px', fontStyle: 'italic', color: '#5c4020' }}>
          <strong>Note:</strong> {cls.notes}
        </div>
      )}
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

  return (
    <div>
      <h1 style={styles.pageHeading}>{sub.name}</h1>
      <div style={{ marginBottom: '14px' }}>
        <span style={styles.pill}>{sub.parentClass} Subclass</span>
        {sub.priority === 'highest' && <span style={{ ...styles.pill, background: '#c9a55c', color: '#3b2615' }}>Priority Rewrite — Tier 1</span>}
        {sub.priority === 'second' && <span style={{ ...styles.pill, background: '#c9a55c', color: '#3b2615' }}>Priority Rewrite — Tier 2</span>}
      </div>

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

      <h2 style={styles.sectionHeading}>Features</h2>
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

      <h2 style={styles.sectionHeading}>Key Traits</h2>
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
