// Traced against the CURRENT background cells, viewed at 1536 × 1024.
// These coordinates scale with the background, not with free-standing sprites.
// Paths are rasterized once into alpha masks; drawing and picking share those
// exact pixels. Curves follow bodywork; separate subpaths preserve narrow props
// and holes instead of filling their bounding rectangle. See ART-HIGHLIGHTS.md.
export const SCENERY_MASKS = {
  proving:{
    kiosk:{bounds:[105,430,242,161],path:'M 108 431 L 345 434 L 345 575 L 328 589 L 106 591 Z'},
    warning:{bounds:[619,428,90,186],path:'M 621 430 L 706 432 L 708 551 L 686 553 L 686 598 L 675 601 L 674 554 L 641 553 L 642 612 L 631 612 L 632 553 L 620 551 Z'},
    minefield:{bounds:[664,704,725,195],path:'M 680 755 C 840 696 1130 710 1304 704 L 1389 868 C 1155 884 900 899 664 885 Z'},
    serviceGate:{bounds:[1200,343,249,178],path:'M 1202 345 L 1447 343 L 1446 502 L 1223 520 L 1225 366 L 1201 366 Z'}
  },
  kickstand: {
    dumpster: {
      bounds:[0,512,356,273],
      path:`M 0 516 L 64 522 L 89 531 L 132 527 L 155 532
        L 173 528 L 194 535 L 207 532 L 260 543 L 282 543
        L 287 549 L 303 551 L 303 557 L 339 564 L 353 576
        L 354 586 L 346 590 L 346 735 L 336 741
        L 334 755 C 333 766 322 772 316 762 L 316 748
        L 130 765 C 131 780 115 787 108 775 L 106 765
        L 27 746 L 21 753 C 12 756 10 742 12 735
        L 4 730 L 4 659 L 0 656 Z`,
    },
    bar: {
      bounds:[592,467,75,184],
      path:'M 595 469 L 660 477 L 665 482 L 663 645 L 594 650 L 594 479 Z',
    },
    sign: {
      bounds:[263,124,509,263],
      path:`M 266 132 L 303 125 L 770 258 L 771 270
        L 763 272 L 762 383 L 753 386 L 283 330
        L 274 325 L 273 152 L 265 149 Z`,
    },
  },
  garage: {
    workbench: {
      bounds:[453,432,393,252],
      path:`M 552 434 L 793 434 L 793 535 L 788 539
        L 790 557 L 844 559 L 844 571 L 837 574 L 836 679
        L 825 681 L 823 658 L 765 658 L 762 681 L 750 682
        L 748 658 L 651 658 L 650 681 L 635 683
        L 635 676 L 474 676 L 473 683 L 460 682
        L 460 576 L 454 573 L 454 560 L 553 558 Z
        M 654 586 L 749 586 L 748 646 L 653 646 Z
        M 767 588 L 824 588 L 824 646 L 765 646 Z`,
    },
  },
  yard: {
    wreck: {
      bounds:[157,468,665,296],
      path:`M 161 585 C 173 573 198 573 226 569
        C 237 551 244 530 259 518 C 277 499 300 486 327 480
        C 357 474 401 472 437 471 C 476 469 517 473 542 478
        C 570 483 587 493 595 508 L 619 551
        L 650 554 L 658 551 L 659 545
        C 650 544 650 536 660 535 C 672 535 681 540 684 548
        L 679 554 L 668 555 L 668 558
        C 698 561 718 574 732 584 L 762 591
        C 783 590 802 600 808 615 C 814 627 810 639 801 646
        L 797 666 L 806 671 L 804 691 L 814 698
        C 820 707 820 718 811 725 L 792 730
        L 780 737 L 761 742 L 750 742 L 748 735
        L 661 742 L 640 743 L 635 749 L 613 750 L 608 746
        L 533 745 L 511 738 L 506 742
        C 500 757 488 763 474 761 C 456 763 446 754 442 737
        L 437 723 L 408 720 L 385 714 L 259 698
        L 238 695 C 234 707 220 709 210 704
        C 200 700 198 692 195 680 L 177 676 L 170 665
        L 163 650 L 163 611 L 158 606 Z`,
    },
    pump: {
      bounds:[1325,409,210,392],
      path:`M 1417 410 C 1446 408 1467 425 1472 448
        C 1480 475 1462 498 1437 504 L 1439 512
        C 1459 511 1478 519 1485 531 L 1488 548
        L 1492 774 L 1497 784 L 1496 792
        C 1470 801 1391 800 1363 790 L 1363 781 L 1373 774
        L 1371 548 L 1374 534 C 1379 520 1398 513 1425 512
        L 1424 506 C 1404 507 1389 492 1384 473
        C 1379 451 1388 423 1405 415 Z
        M 1375 564 L 1380 573 C 1373 626 1374 682 1368 724
        C 1364 749 1352 769 1331 782 L 1326 775
        C 1342 763 1353 746 1358 721 C 1365 681 1363 617 1371 575 Z
        M 1483 579 L 1492 578 L 1499 600 L 1492 608
        C 1502 663 1502 716 1526 754 C 1540 775 1534 794 1516 798
        C 1491 802 1463 781 1458 749 L 1466 746
        C 1474 777 1495 791 1513 790 C 1527 787 1529 776 1519 759
        C 1497 720 1493 664 1484 610 Z`,
    },
    shack: {
      bounds:[1037,278,377,381],
      path:`M 1083 337 L 1169 321 L 1170 310 L 1167 305
        L 1165 283 L 1170 279 L 1195 287 L 1200 295
        L 1193 308 L 1187 312 L 1187 317 L 1268 299
        L 1409 345 L 1412 353 L 1409 357 L 1397 358
        L 1390 382 L 1388 544 L 1394 549 L 1392 565
        L 1378 567 L 1378 605 L 1368 606 L 1367 568
        L 1270 568 L 1270 606 L 1260 606 L 1260 568
        L 1204 568 L 1202 617 L 1191 618 L 1193 568
        L 1184 568 L 1129 655 L 1120 657 L 1119 650
        L 1049 649 L 1044 655 L 1038 652 L 1040 644
        L 1107 545 L 1118 546 L 1117 389 L 1107 361
        L 1083 349 Z
        M 1097 575 L 1149 575 L 1155 564 L 1104 564 Z
        M 1085 594 L 1137 594 L 1143 583 L 1092 583 Z
        M 1074 612 L 1124 612 L 1131 601 L 1081 601 Z
        M 1061 632 L 1111 632 L 1118 620 L 1069 620 Z
        M 1051 645 L 1105 645 L 1108 639 L 1055 639 Z`,
    },
  },
  corley: {
    terminal: {
      bounds:[124,591,100,156],
      path:'M 125 598 L 139 593 L 211 595 L 222 603 L 221 613 L 211 613 L 210 739 L 217 745 L 137 745 L 132 740 L 131 613 L 126 611 Z',
    },
    plaque: {
      bounds:[519,312,148,151],
      path:`M 592 314 C 558 313 535 331 529 352
        L 521 349 L 524 362 L 531 368 C 532 413 552 449 588 460
        C 618 462 643 440 654 409 L 658 392 L 664 373 L 658 368
        C 651 337 626 316 592 314 Z`,
    },
    factory: {
      bounds:[486,149,167,110],
      path:'M 489 151 L 650 176 L 649 257 L 488 229 Z',
    },
  },
};

export function sceneryBox(scene,id){
  const definition=SCENERY_MASKS[scene]?.[id];if(!definition)return null;
  const [x,y,w,h]=definition.bounds;
  return {x:x/2,y:y/2,w:w/2,h:h/2};
}

// Cropped masks are independent of viewport size, cached lazily, and never
// change the background image. Sprite highlighting can consume them directly.
export function createSceneryMasks(makeCanvas,makePath=value=>new Path2D(value)){
  const cache=new Map();
  return {
    get(scene,id){
      const definition=SCENERY_MASKS[scene]?.[id];if(!definition)return null;
      const key=scene+':'+id;if(cache.has(key))return cache.get(key);
      const [x,y,w,h]=definition.bounds;
      const canvas=makeCanvas();canvas.width=w;canvas.height=h;
      const c=canvas.getContext('2d');c.translate(-x,-y);c.fillStyle='#fff';
      c.fill(makePath(definition.path),'evenodd');
      const result={asset:{image:canvas,ready:true},frame:[0,0,w,h],box:sceneryBox(scene,id)};
      cache.set(key,result);return result;
    }
  };
}
