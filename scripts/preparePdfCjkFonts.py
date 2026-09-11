import sys
# Requires fonttools==4.61.1. Run from repository root.
# Input: official NotoSansSC-VF.ttf saved to tmp/; outputs are in public/fonts.
sys.path.insert(0,'tmp/font-tools')
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset
for weight,style in [(400,'Regular'),(700,'Bold')]:
    font=TTFont('tmp/NotoSansSC-VF.ttf')
    instantiateVariableFont(font,{'wght':weight},inplace=True)
    options=subset.Options()
    options.layout_features=[]
    sub=subset.Subsetter(options=options)
    sub.populate(unicodes=list(range(0x20,0x300))+list(range(0x2000,0x2070))+list(range(0x3000,0x3100))+list(range(0x3400,0xa000))+list(range(0xff00,0xfff0)))
    sub.subset(font)
    font.save('public/fonts/NotoSansSC-'+style+'.ttf')
    print(style,flush=True)
