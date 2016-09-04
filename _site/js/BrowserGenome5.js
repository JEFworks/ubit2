

// (c) 2013-2015 Jonathan Schmid-Burgk
// BrowserGenome.js provides:
// - loading .2bit genome file to memory
// - loading gene annotations from server
// - indexing the genome data
// - searching short sequences in the genome



//VARIABLES

//Genome data:
var IndexBytes, Index, HookBytes, Hook, GenomeBytes, Genome, HookCountBytes, HookCount, Seqs;
var GenomeLength = 0;
var GenomeLoaded = false;
var Species = "", GenomeVersion = "";

//Indexing:
var IndexingChr, IndexingChrEnd, IndexingPos, numKmers, IndexReady = false, HIGHMEM = false;

//Genome model:
var GenomeModelName = "";

//Chromosome annotation:
var ChromosomeStartBytes = new ArrayBuffer(4*500), ChromosomeStart = new Uint32Array(ChromosomeStartBytes);
var ChromosomeEndBytes = new ArrayBuffer(4*500), ChromosomeEnd = new Uint32Array(ChromosomeEndBytes);
var ChromosomeName = new Array(500);
var ChromosomeNum = 0;

//RNA annotation:
var RnaHitStartBytes, RnaHitStart, RnaHitEndBytes, RnaHitEnd, RnaHitName, RnaHitNum = 0;



//FUNCTIONS


//Callback function to be used with a file input element by which the user selects the .2bit genome file (eg. hg19.2bit)
var GenomeFile;
var GenomeFileChromosomeByteOffset = new Array(500), GenomeFileChromosomeByteEnd = new Array(500);
var GenomeFileCurrentChromosome;
function LoadGenome()
{    
    //Check if the right genome:
    if (this.value.search(GenomeVersion) == -1)
    {
        alert("The sequence file you have specified ("+this.value+") does not match the current genome version ("+GenomeVersion+").");
        return;
    }
   
    var evt = this;
    GenomeFile = evt.files[0];
    reader = new FileReader();
    reader.onload = function(evt)
    {
        GenomeBytes = new ArrayBuffer(Math.floor(GenomeLength/4));
        Genome = new Uint8Array(GenomeBytes);
        
        var filepos = 0;
        var FileHeaderBytes = evt.target.result.slice(filepos,(filepos += 16));
        var FileHeader = new Uint32Array(FileHeaderBytes);
        
        //Get header into arrays:
        var Name = new Array(500), Offset = new Array(500);
        for (var FileSeq=0; FileSeq<FileHeader[2]; FileSeq++)
        {
            var dummy = new Uint8Array(evt.target.result.slice(filepos,(filepos += 1)));
            var NameLength = dummy[0];
            
            Name[FileSeq] = new Uint8Array(evt.target.result.slice(filepos,(filepos += NameLength)));
            Name[FileSeq] = String.fromCharCode.apply(null, Name[FileSeq]);
            Name[FileSeq] = decodeURIComponent(escape(Name[FileSeq]));
            
            dummy = new Uint32Array(evt.target.result.slice(filepos,(filepos += 4)));
            Offset[FileSeq] = dummy[0];
        }
        
        //Assign offsets to existing chromosomes:
        for (var FileSeq=0; FileSeq<FileHeader[2]; FileSeq++) for (var c=0; c<ChromosomeNum; c++) if (ChromosomeName[c] == Name[FileSeq])
        {   
            GenomeFileChromosomeByteOffset[c] = Offset[FileSeq];
            if (FileSeq+1 < FileHeader[2]) GenomeFileChromosomeByteEnd[c] = Offset[FileSeq+1];
            else GenomeFileChromosomeByteEnd[c] = GenomeFile.size;
        }
        
        //Load first chr:
        GenomeFileCurrentChromosome = 0;
        var reader = new FileReader();
        reader.onload = ReadSingleChromosomeFromGenomeFile;
        reader.readAsArrayBuffer(GenomeFile.slice(GenomeFileChromosomeByteOffset[GenomeFileCurrentChromosome], GenomeFileChromosomeByteEnd[GenomeFileCurrentChromosome]));
    }
    reader.readAsArrayBuffer(GenomeFile.slice(0,1000000)); //read only the header first
    document.getElementById('SeqProgress').style.display = "";
    document.getElementById('SeqProgress').innerHTML = "Loading the genome...";
}
function ReadSingleChromosomeFromGenomeFile(evt2)
{
    var filepos2 = 0;
    
    //Correct Chromosome start positions:
    dummy = new Uint32Array(evt2.target.result.slice(filepos2,filepos2 += 4));
    var dnaSize = dummy[0];

    dummy = new Uint32Array(evt2.target.result.slice(filepos2,filepos2 += 4));
    var nBlockCount = dummy[0];

    filepos2 += 4*(2*nBlockCount);

    dummy = new Uint32Array(evt2.target.result.slice(filepos2,filepos2 += 4));
    var maskBlockCount = dummy[0];

    filepos2 += 4*(2*maskBlockCount);

    //reserved:
    filepos2 += 4;

    //alert(Name+" "+ChrPosByte);
    Genome.set( new Uint8Array(evt2.target.result.slice(filepos2, filepos2+Math.floor(dnaSize/4))) , Math.floor(ChromosomeStart[GenomeFileCurrentChromosome]/4));
    
    document.getElementById('SeqProgress').innerHTML = "Loading chromosome sequence: "+ChromosomeName[GenomeFileCurrentChromosome];
    
    //Load next:
    GenomeFileCurrentChromosome++
    if (GenomeFileCurrentChromosome < ChromosomeNum)
    {
        var reader = new FileReader();
        reader.onload = ReadSingleChromosomeFromGenomeFile;
        reader.readAsArrayBuffer(GenomeFile.slice(GenomeFileChromosomeByteOffset[GenomeFileCurrentChromosome], GenomeFileChromosomeByteEnd[GenomeFileCurrentChromosome]));
    }
    else
    {
        GenomeLoaded = true;
        document.getElementById('SeqProgress').style.display = "none";
    }
}






// Fast search of a >=23 nt sequence in the loaded and indexed genome, return number of hits
var SEARCH_HitPos = Array(1000), SEARCH_HitLen = Array(1000), SEARCH_HitNum;
function SEARCH(seq)
{
    SEARCH_HitNum = 0;
    if (!HIGHMEM)
    {
        //test up- & downstream processing speed. result: in highmem mode, downstream processing + file handling makes up <10% of time
        /*SEARCH_HitPos[0] = SEARCH_HitPos[1] = 1000;
        SEARCH_HitLen[0] = SEARCH_HitLen[1] = 25;
        return 2;*/
        
        SEARCH_intern(seq,0);
        SEARCH_intern(seq,1);
    }
    else
    {
        SEARCH_intern_HIGHMEM(seq,0);
        SEARCH_intern_HIGHMEM(seq,1);
    }
    
    return SEARCH_HitNum;
}

// Fast search of a >=23 nt sequence in the loaded and indexed genome
var SEARCHseq;
function SEARCH_intern(seq, strand)
{
    if (strand == 1) seq = ReverseComplement(seq);
    SEARCHseq = seq;
    
    
    var len = seq.length;
    if (len<23) return 0;
    //if (len<25) SEARCH_shorter_25(seq);
    var hit = 0;
    var Kmer, next0, next1, next2, next3;
    
    for (var shift=0; shift<12; shift++)
    {
        Kmer = MakeKmer2(shift, 12);
        pos = Hook[Kmer];
        
        //if (pos != 0) //doesn't change speed
        {
            //next0 = MakeKmer2(shift-8 ,4);
            next1 = MakeKmer2(shift-4 ,4); //removing these 2 greatly reduces speed, the others don't matter
            next2 = MakeKmer2(shift+12,4); //removing these 2 greatly reduces speed, the others don't matter
            //next3 = MakeKmer2(shift+16,4);
            //next4 = MakeKmer2(shift+20,4);
            
            while (pos != 0)
            {
                //if (next0 == -1 | Genome[pos*3-2] == next0)
                if (next1 == -1 | Genome[pos*3-1] == next1)
                    if (next2 == -1 | Genome[pos*3+3] == next2)
                        //if (next3 == -1 | Genome[pos*3+4] == next3)
                        //if (next4 == -1 | Genome[pos*3+5] == next4)
                        if (getGATC(pos*12-shift, len) == seq) //removing the naive string compare only slightly increases speed
                        {
                            if (strand == 0) //sense
                            {
                                SEARCH_HitPos[SEARCH_HitNum] = pos*12-shift;
                                SEARCH_HitLen[SEARCH_HitNum++] = seq.length;
                            }
                            else //anti
                            {
                                SEARCH_HitPos[SEARCH_HitNum] = pos*12-shift + seq.length; //The first base NOT contained
                                SEARCH_HitLen[SEARCH_HitNum++] = 0-seq.length;
                            }
                        }
                
                pos = Index[pos];
            }
        }
    }
    
    return 0;
}
function SEARCH_intern_HIGHMEM(seq, strand)
{
    if (strand == 1) seq = ReverseComplement(seq);
    SEARCHseq = seq;
    
    
    var len = seq.length;
    if (len<23) return 0;
    //if (len<25) SEARCH_shorter_25(seq);
    var hit = 0;
    var Kmer, preKmer, next0, next1, next2, next3;
    
    for (var shift=0; shift<8; shift++)
    {
        preKmer = MakeKmer2(shift, 2);
        Kmer = MakeKmer2(shift+2, 14);
        
        pos = Hook[preKmer][Kmer];
        
        //if (pos != 0)
        {
            while (pos != 0)
            {
                //if (getGATC(pos*8-shift, len) == seq)
                if (getGATC(pos*8-shift, shift) == seq.substr(0,shift)) if (getGATC(pos*8+16, len-16-shift) == seq.substr(16+shift,len-16-shift)) //faster
                {
                    if (strand == 0) //sense
                    {
                        SEARCH_HitPos[SEARCH_HitNum] = pos*8-shift;
                        SEARCH_HitLen[SEARCH_HitNum++] = seq.length;
                    }
                    else //anti
                    {
                        SEARCH_HitPos[SEARCH_HitNum] = pos*8-shift + seq.length; //The first base NOT contained
                        SEARCH_HitLen[SEARCH_HitNum++] = 0-seq.length;
                    }
                }
                
                pos = Index[pos];
            }
        }
    }
    
    return 0;
}

//LOADING GENOME MODELS:
function ParseBrowGenModel(data, NewGenomeModelName)
{
    GenomeLoaded = false;
    Genome = null;
    GenomeBytes = null;
    Hook = null;
    HookBytes = null;
    Index = null;
    IndexBytes = null;
    GenomeModelName = NewGenomeModelName;
    
    var filepos = 0;
    var InitialVariablesBytes = data.slice(filepos,filepos+=16*4);
    var InitialVariables = new Uint32Array(InitialVariablesBytes);
    
    var version = InitialVariables[0]; 
    RnaHitNum = InitialVariables[1];
    ChromosomeNum = InitialVariables[2];
    GenomeLength = InitialVariables[3];
    //alert(RnaHitNum+" "+ChromosomeNum+" "+GenomeLength);
    
    if (version >= 0)
    {
        RnaHitStartBytes = data.slice(filepos,filepos+=RnaHitNum*4);
        RnaHitStart = new Uint32Array(RnaHitStartBytes);
        
        RnaHitEndBytes = data.slice(filepos,filepos+=RnaHitNum*4);
        RnaHitEnd = new Uint32Array(RnaHitEndBytes);
        
        //ChromosomeStartBytes = xhr.response.slice(filepos,filepos+=ChromosomeNum*4);
        //ChromosomeStart = new Uint32Array(ChromosomeStartBytes);
        var dummy = data.slice(filepos,filepos+=ChromosomeNum*4);
        ChromosomeStart.set(new Uint32Array(dummy));
        
        if (version >= 1)
        {
            //ChromosomeEndBytes = xhr.response.slice(filepos,filepos+=ChromosomeNum*4);
            //ChromosomeEnd = new Uint32Array(ChromosomeEndBytes);
            var dummy = data.slice(filepos,filepos+=ChromosomeNum*4);
            ChromosomeEnd.set(new Uint32Array(dummy));
        }
        
        var NameListBytes = data.slice(filepos);
        NameList = new Uint8Array(NameListBytes);
        var NameListString = "";
        for (var i=0; i<NameList.length; i++) NameListString += String.fromCharCode(NameList[i]);
        RnaHitName = NameListString.split(",");
        //alert(RnaHitName.length);
        for (var i=0; i<ChromosomeNum; i++) ChromosomeName[i] = RnaHitName[RnaHitName.length-2-ChromosomeNum+i]; //at the end of the array
        Species = RnaHitName[RnaHitName.length-2];
        GenomeVersion = RnaHitName[RnaHitName.length-1];
        RnaHitName.length = RnaHitNum;
    }
}




//INTERNAL FUNCTIONS

// Get the reverse complement DNA sequence, N stays N
function ReverseComplement(A)
{
    var dummy = "";
    for (var i=0; i<A.length; i++)
    {
        if (A[A.length-1-i] == 'G') dummy += 'C'; else
            if (A[A.length-1-i] == 'A') dummy += 'T'; else
                if (A[A.length-1-i] == 'T') dummy += 'A'; else
                    if (A[A.length-1-i] == 'C') dummy += 'G'; else
                        dummy += 'N';
    }
    return dummy;
}
    
// Transform a sequence to a number
function MakeKmer(seq, k)
{
    var out = 0;
    var seqlen = seq.length;
    
    //for (var i=8-1; i>=0; i--)
    for (var i=0; i<k; i++)
    {
        if (i >= seqlen) return -1;
        
        var here;
        if (seq[i] == 'T') here = 0; else
            if (seq[i] == 'C') here = 1; else
                if (seq[i] == 'A') here = 2; else
                /*if (seq[i] == 'G')*/ here = 3;
        
        out *= 4;
        out += here;
    }
    return out;
}

// Transform a sequence to a number
function MakeKmer2(start, k)
{
    var out = 0;
    var here;
    var end = start+k;
    if (start < 0 || end > SEARCHseq.length) return -1;
    
    for (var i=start; i<end; i++)
    {
        if (SEARCHseq[i] == 'T') here = 0; else
            if (SEARCHseq[i] == 'C') here = 1; else
                if (SEARCHseq[i] == 'A') here = 2; else
                    if (SEARCHseq[i] == 'G') here = 3;
                        else return 0; //Ns are not tolerated
        
        out *= 4;
        out += here;
    }
    return out;
}

// Transform a 4 nt sequence to a number
function Make4mer(start)
{
    var out = 0;
    var end = start+4;
    //if (start < 0 || end > SEARCHseq.length) return -1;
    
    for (var i=start; i<end; i++)
    {
        out *= 4;
        if (SEARCHseq[i] == 'T') out += 0; else
            if (SEARCHseq[i] == 'C') out += 1; else
                if (SEARCHseq[i] == 'A') out += 2; else
                /*if (SEARCHseq[i] == 'G')*/ out += 3;
    }
    return out;
}

    
// Retrieve the genome sequence at position pos as letters
function getGATC(pos, span)
{
    var bytepos = Math.floor(pos/4);
    var basepos = pos-bytepos*4;
    
    var out = "";
    
    for (var pos=0; pos<span; pos++)
    {
        var input = Genome[bytepos];
        //input = input >> (2*(3-basepos));
        for (var i=0; i<3-basepos; i++) input /= 4;
        input = Math.floor(input);
        //input &= 3;
        input %= 4;
        
        if (input==0) out += 'T'; else
            if (input==1) out += 'C'; else
                if (input==2) out += 'A'; else
                    if (input==3) out += 'G';
        
        basepos++;
        if (basepos==4)
        {
            bytepos++;
            basepos=0;
        }
    }
    
    return out;
}


//INDEXING:

// Calculate the index of the genome for fast searches; CallAtEnd will be called when the index is ready
function GenerateIndex(CallAtEnd, a)
{
    if (!GenomeLoaded)
    {
        alert("A genome sequence file must be loaded.");
        return false;
    }
    
    if (!IndexReady)
    {
        document.getElementById('SeqProgress').style.display = "";
        document.getElementById('SeqProgress').innerHTML = "Reserving memory...";
        
        if (!HIGHMEM)
        {
            numKmers = Math.floor(GenomeLength/12);
            
            IndexBytes = new ArrayBuffer(numKmers*4);
            Index = new Uint32Array(IndexBytes);
            HookBytes = new ArrayBuffer(Math.pow(4,12)*4);
            Hook = new Uint32Array(HookBytes);
            HookCountBytes = new ArrayBuffer(Math.pow(4,12)*2);
            HookCount = new Uint16Array(HookCountBytes);
            
            /*for (var i=0; i<Math.pow(4,12); i++) //are zeroed per default
            {
                Hook[i] = 0;
                HookCount[i] = 0;
            }*/
            
            IndexingChr = -1;
            IndexingSelectNextChr();
            
            GenrateIndexInternal(CallAtEnd, a);
        }
        else
        {
            numKmers = Math.floor(GenomeLength/8);
            
            IndexBytes = new ArrayBuffer(numKmers*4);
            Index = new Uint32Array(IndexBytes);
            HookBytes = new Array(16); //split into 16 smaller arrays because of javascript size limit per array
            Hook = new Array(16);
            HookCountBytes = new Array(16);
            HookCount = new Array(16);
            for (var i=0; i<16; i++)
            {
                HookBytes[i] = new ArrayBuffer(Math.pow(4,14)*4);
                Hook[i] = new Uint32Array(HookBytes[i]);
                HookCountBytes[i] = new ArrayBuffer(Math.pow(4,14)*1);
                HookCount[i] = new Uint8Array(HookCountBytes[i]);
                
                /*for (var ii=0; ii<Math.pow(4,14); ii++) //are zeroed per default
                {
                    Hook[i][ii] = 0;
                    HookCount[i][ii] = 0;
                }*/
            }
            
            IndexingChr = -1;
            IndexingSelectNextChr();
            
            GenrateIndexInternal_HIGHMEM(CallAtEnd, a);
        }
    }
    else setTimeout(CallAtEnd,10, a);
}   

//Internal function for choosing the next chromosome to be indexed
function IndexingSelectNextChr()
{
    IndexingChr++;
    if (IndexingChr >= ChromosomeNum) return false;
    
    if (!HIGHMEM)
    {
        IndexingPos = Math.ceil(ChromosomeStart[IndexingChr] / 12);
        IndexingChrEnd = Math.floor(ChromosomeEnd[IndexingChr] / 12);
    }
    else
    {
        IndexingPos = Math.ceil(ChromosomeStart[IndexingChr] / 8);
        IndexingChrEnd = Math.floor(ChromosomeEnd[IndexingChr] / 8);
    }
    
    //if (ChromosomeName[IndexingChr] == "chr13") alert(ChromosomeName[IndexingChr]+" "+IndexingPos+" "+IndexingChrEnd+" "+ChromosomeStart[IndexingChr]+" "+ChromosomeEnd[IndexingChr]);
    
    return true;
}

// Internal function of Index generation
function GenrateIndexInternal(CallAtEnd, a)
{
    for (var i=0; i<numKmers/100; i++)
    {
        var thisKmer = (Genome[IndexingPos*3+0]<<16) + (Genome[IndexingPos*3+1]<<8) + Genome[IndexingPos*3+2];
        if (HookCount[thisKmer] != 65000)
        {
            Index[IndexingPos] = Hook[thisKmer];
            Hook[thisKmer] = IndexingPos;
            HookCount[thisKmer]++;
        }
        //else Hook[thisKmer] = 0;
        
        IndexingPos++;
        if (IndexingPos == IndexingChrEnd) if (!IndexingSelectNextChr())
        {
            IndexingFinish(CallAtEnd, a)
            return;
        }
    }
    
    //visualize the progress:
    document.getElementById('SeqProgress').style.display = "";
    document.getElementById('SeqProgress').innerHTML = "Index generation: " + Math.floor(IndexingPos/numKmers*100) + "% ("+ChromosomeName[IndexingChr]+")";
    
    //recursion:
    setTimeout(GenrateIndexInternal,10, CallAtEnd, a);
}

// Internal function of Index generation (IN HIGHMEM MODE)
function GenrateIndexInternal_HIGHMEM(CallAtEnd, a)
{
    for (var i=0; i<numKmers/100; i++)
    {
        var preKmer = Genome[IndexingPos*2+0] >> 4;
        var Kmer = ((Genome[IndexingPos*2+0] & 0x0F)<<24) + (Genome[IndexingPos*2+1]<<16) + (Genome[IndexingPos*2+2]<<8) + Genome[IndexingPos*2+3];
        
        if (HookCount[preKmer][Kmer] != 255)
        {
            Index[IndexingPos] = Hook[preKmer][Kmer];
            Hook[preKmer][Kmer] = IndexingPos;
            HookCount[preKmer][Kmer]++;
        }
        //else Hook[thisKmer] = 0;
        
        IndexingPos++;
        if (IndexingPos == IndexingChrEnd) if (!IndexingSelectNextChr())
        {
            IndexingFinish(CallAtEnd, a);
            return;
        }
    }
    
    //visualize the progress:
    document.getElementById('SeqProgress').style.display = "";
    document.getElementById('SeqProgress').innerHTML = "Index generation: " + Math.floor(IndexingPos/numKmers*100) + "% ("+ChromosomeName[IndexingChr]+")";
    
    //recursion:
    setTimeout(GenrateIndexInternal_HIGHMEM,10, CallAtEnd, a);
}
  
// Internal function of finishing the indexing process
function IndexingFinish(CallAtEnd, a)
{
    var highcount = 0;
    
    //remove low-complexity kmers:
    if (!HIGHMEM)
    {
        var thr = 500; //ca. 1% less hits, ca. 40% faster
        for (var i=0; i<Math.pow(4,12); i++) if (HookCount[i] >= thr)
        {
            //alert(getGATC(Hook[i]*12,12)+" "+HookCount[i]);
            Hook[i] = 0;
            highcount++;
        }
        //alert(highcount+" kmers ("+(highcount/Math.pow(4,12)*100)+"%) >"+thr+" times found");
        HookCount = null;
        HookCountBytes = null;
    }
    else
    {
        var thr = 6;
        for (var i=0; i<16; i++) for (var ii=0; ii<Math.pow(4,14); ii++) if (HookCount[i][ii] >= thr)
        {
            //alert(getGATC(Hook[i]*12,12)+" "+HookCount[i]);
            Hook[i][ii] = 0;
            highcount++;
        }
        //alert(highcount+" kmers ("+(highcount/Math.pow(4,12)*100)+"%) >"+thr+" times found");
        for (var i=0; i<16; i++)
        {
            HookCount[i] = null;
            HookCountBytes[i] = null;
        }
        HookCount = null;
        HookCountBytes = null;
    }
    
    //document.getElementById('SeqProgress').style.display = "none";
    document.getElementById('SeqProgress').innerHTML = "Index was generated.";
    IndexReady = true;

    // a is parameter given to CallAtEnd. setTimeout requires function be put in quotes
    setTimeout(CallAtEnd,10, a);
}

//Function for deleting the index from memory:
function ForgetIndex()
{
    if (!HIGHMEM)
    {
        IndexReady = false;
        IndexBytes = null;
        Index = null;
        HookBytes = null;
        Hook = null;
    }
    else
    {
        IndexReady = false;
        IndexBytes = null;
        Index = null;
        for (var i=0; i<16; i++)
        {
            Hook[i] = null;
            HookBytes[i] = null;
        }
        Hook = null;
        HookBytes = null;
    }
}


    

