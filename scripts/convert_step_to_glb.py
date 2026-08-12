#!/usr/bin/env python3

import argparse
import math
import sys

from OCP.BRepBndLib import BRepBndLib
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.Bnd import Bnd_Box
from OCP.IFSelect import IFSelect_RetDone
from OCP.Message import Message_ProgressRange
from OCP.RWGltf import RWGltf_CafWriter
from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.TColStd import TColStd_IndexedDataMapOfStringString
from OCP.TCollection import TCollection_AsciiString, TCollection_ExtendedString
from OCP.TDF import TDF_LabelSequence
from OCP.TDocStd import TDocStd_Document
from OCP.XCAFApp import XCAFApp_Application
from OCP.XCAFDoc import XCAFDoc_DocumentTool


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    args = parser.parse_args()

    app = XCAFApp_Application.GetApplication_s()
    document = TDocStd_Document(TCollection_ExtendedString("BinXCAF"))
    app.NewDocument(TCollection_ExtendedString("BinXCAF"), document)

    reader = STEPCAFControl_Reader()
    reader.SetColorMode(True)
    reader.SetNameMode(True)
    reader.SetLayerMode(True)
    reader.SetMatMode(True)
    status = reader.ReadFile(args.input)
    if status != IFSelect_RetDone:
        raise RuntimeError(f"STEP reader failed with status {status}")
    if not reader.Transfer(document):
        raise RuntimeError("STEP transfer into XCAF document failed")

    shape_tool = XCAFDoc_DocumentTool.ShapeTool_s(document.Main())
    labels = TDF_LabelSequence()
    shape_tool.GetFreeShapes(labels)
    if labels.Length() == 0:
        raise RuntimeError("STEP document did not contain any free shapes")

    bounds = Bnd_Box()
    shapes = []
    for index in range(1, labels.Length() + 1):
        shape = shape_tool.GetShape_s(labels.Value(index))
        if shape.IsNull():
            continue
        shapes.append(shape)
        BRepBndLib.Add_s(shape, bounds)

    if not shapes or bounds.IsVoid():
        raise RuntimeError("STEP document did not contain usable geometry")

    xmin, ymin, zmin, xmax, ymax, zmax = bounds.Get()
    size = (xmax - xmin, ymax - ymin, zmax - zmin)
    diagonal = math.sqrt(sum(axis * axis for axis in size))
    # Fine enough for front-panel controls and vent perforations while avoiding
    # an unnecessarily massive intermediate tessellation.
    linear_deflection = max(diagonal / 4000.0, 0.05)

    for shape in shapes:
        mesher = BRepMesh_IncrementalMesh(
            shape,
            linear_deflection,
            False,
            0.25,
            True,
        )
        mesher.Perform()
        if not mesher.IsDone():
            raise RuntimeError("OpenCascade tessellation did not complete")

    writer = RWGltf_CafWriter(TCollection_AsciiString(args.output), True)
    metadata = TColStd_IndexedDataMapOfStringString()
    metadata.Add(
        TCollection_AsciiString("Title"),
        TCollection_AsciiString("Eaton 9PX3000IRT2U UPS"),
    )
    if not writer.Perform(document, metadata, Message_ProgressRange()):
        raise RuntimeError("OpenCascade GLB export failed")

    print(
        "STEP bounds:",
        " × ".join(f"{axis:.3f}" for axis in size),
        f"(deflection {linear_deflection:.4f})",
    )
    print(f"Free shapes: {len(shapes)}")
    print(f"Wrote: {args.output}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Conversion failed: {error}", file=sys.stderr)
        raise
