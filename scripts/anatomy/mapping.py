"""Which BodyParts3D structures are drawn and which FitTune muscle group each one trains

Names are the FMA English names from the BodyParts3D parts list. Rules are matched
against the name with the body side removed, first match wins
"""

import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Structure:
    element: str
    path: Path
    label: str
    kind: str
    muscle: str | None


# Muscles that are not part of the visible musculoskeletal figure
EXCLUDED = re.compile(
    r"papillary|of eyeball|\b(superior|inferior|medial|lateral) rectus$|\b(superior|inferior) oblique$"
    r"|levator palpebrae|arytenoid|cricothyroid|thyroarytenoid|vocalis|glossus|genioglossus|palat"
    r"|constrictor|tensor tympani|stapedius|auricular|diaphragm|levator ani|coccygeus|sphincter"
    r"|perine|ischiocavernosus|bulbospongiosus|cremaster|check ligament|trochlea of|platysma"
    # Facial expression muscles and the scalp aponeurosis hide the skull and read as a mask
    r"|orbicularis|zygomaticus|levator labii|levator anguli|depressor|risorius|mentalis|nasalis"
    r"|procerus|buccinator|corrugator|epicranius|occipitofrontalis|frontal belly|occipital belly|temporoparietalis"
)

# The oblique meshes include their aponeuroses, which form the front of the rectus sheath.
# Atlases draw the rectus abdominis on top of it, so these structures show through their covers
REVEALED = re.compile(r"rectus abdominis|pyramidalis")
COVERS = re.compile(r"(external|internal) oblique$|transversus abdominis")

# BodyParts3D models the rectus abdominis as one smooth sheet. Its tendinous intersections
# are cut in as fractions of its length from the top: below the xiphoid, midway and at the
# umbilicus, which is what makes the abs read as abs
TENDINOUS_INTERSECTIONS: dict[str, tuple[float, ...]] = {"Rectus abdominis": (0.12, 0.3, 0.5)}

GROUPS: list[tuple[str, re.Pattern[str]]] = [
    ("chest", re.compile(r"pectoralis major")),
    ("shoulders", re.compile(r"deltoid")),
    ("traps", re.compile(r"trapezius$|part of trapezius")),
    ("lats", re.compile(r"latissimus dorsi")),
    ("upper_back", re.compile(r"rhomboid|infraspinatus|supraspinatus|teres (major|minor)")),
    ("lower_back", re.compile(r"iliocostalis|longissimus (thoracis|lumborum)|spinalis thoracis|erector spinae|quadratus lumborum|multifidus")),
    ("biceps", re.compile(r"biceps brachii|brachialis$|coracobrachialis")),
    ("triceps", re.compile(r"triceps brachii|anconeus")),
    ("forearms", re.compile(r"brachioradialis|carpi|digitorum (superficialis|profundus)|digitorum$|digiti minimi$|pollicis longus|pronator teres|supinator|palmaris longus|extensor indicis|abductor pollicis longus")),
    ("abs", re.compile(r"rectus abdominis|external oblique|internal oblique|transversus abdominis|pyramidalis")),
    ("quadriceps", re.compile(r"rectus femoris|vastus")),
    ("hamstrings", re.compile(r"biceps femoris|semitendinosus|semimembranosus")),
    ("glutes", re.compile(r"gluteus")),
    ("calves", re.compile(r"gastrocnemius|soleus|plantaris")),
]

SIDE = re.compile(r"\b(left|right) ")


def unsided(name: str) -> str:
    return re.sub(r"\s+", " ", SIDE.sub("", name.lower())).strip()


def classify(element: str, name: str, kind: str, path: Path) -> Structure | None:
    base = unsided(name)
    if kind == "muscle" and EXCLUDED.search(base):
        return None
    muscle = None
    if kind == "muscle":
        muscle = next((group for group, rule in GROUPS if rule.search(base)), None)
    return Structure(element=element, path=path, label=base[:1].upper() + base[1:], kind=kind, muscle=muscle)
