// seedrandom.js version 2.1.
// Author: David Bau
// Date: 2013 Mar 16
//
// Defines a method Math.seedrandom() that, when called, substitutes
// an explicitly seeded RC4-based algorithm for Math.random().  Also
// supports automatic seeding from local or network sources of entropy.
//
// http://davidbau.com/encode/seedrandom.js
// http://davidbau.com/encode/seedrandom-min.js
//
// Usage:
//
//   <script src=http://davidbau.com/encode/seedrandom-min.js></script>
//
//   Math.seedrandom('yay.');  Sets Math.random to a function that is
//                             initialized using the given explicit seed.
//
//   Math.seedrandom();        Sets Math.random to a function that is
//                             seeded using the current time, dom state,
//                             and other accumulated local entropy.
//                             The generated seed string is returned.
//
//   Math.seedrandom('yowza.', true);
//                             Seeds using the given explicit seed mixed
//                             together with accumulated entropy.
//
//   <script src="https://jsonlib.appspot.com/urandom?callback=Math.seedrandom">
//   </script>                 Seeds using urandom bits from a server.
//
// More advanced examples:
//
//   Math.seedrandom("hello.");           // Use "hello." as the seed.
//   document.write(Math.random());       // Always 0.9282578795792454
//   document.write(Math.random());       // Always 0.3752569768646784
//   var rng1 = Math.random;              // Remember the current prng.
//
//   var autoseed = Math.seedrandom();    // New prng with an automatic seed.
//   document.write(Math.random());       // Pretty much unpredictable x.
//
//   Math.random = rng1;                  // Continue "hello." prng sequence.
//   document.write(Math.random());       // Always 0.7316977468919549
//
//   Math.seedrandom(autoseed);           // Restart at the previous seed.
//   document.write(Math.random());       // Repeat the 'unpredictable' x.
//
//   function reseed(event, count) {      // Define a custom entropy collector.
//     var t = [];
//     function w(e) {
//       t.push([e.pageX, e.pageY, +new Date]);
//       if (t.length < count) { return; }
//       document.removeEventListener(event, w);
//       Math.seedrandom(t, true);        // Mix in any previous entropy.
//     }
//     document.addEventListener(event, w);
//   }
//   reseed('mousemove', 100);            // Reseed after 100 mouse moves.
//
// Version notes:
//
// The random number sequence is the same as version 1.0 for string seeds.
// Version 2.0 changed the sequence for non-string seeds.
// Version 2.1 speeds seeding and uses window.crypto to autoseed if present.
//
// The standard ARC4 key scheduler cycles short keys, which means that
// seedrandom('ab') is equivalent to seedrandom('abab') and 'ababab'.
// Therefore it is a good idea to add a terminator to avoid trivial
// equivalences on short string seeds, e.g., Math.seedrandom(str + '\0').
// Starting with version 2.0, a terminator is added automatically for
// non-string seeds, so seeding with the number 111 is the same as seeding
// with '111\0'.
//
// When seedrandom() is called with zero args, it uses a seed
// drawn from the browser crypto object if present.  If there is no
// crypto support, seedrandom() uses the current time, the native rng,
// and a walk of several DOM objects to collect a few bits of entropy.
//
// Each time the one- or two-argument forms of seedrandom are called,
// entropy from the passed seed is accumulated in a pool to help generate
// future seeds for the zero- and two-argument forms of seedrandom.
//
// On speed - This javascript implementation of Math.random() is about
// 3-10x slower than the built-in Math.random() because it is not native
// code, but that is typically fast enough.  Some details (timings on
// Chrome 25 on a 2010 vintage macbook):
//
// seeded Math.random()          - avg less than 0.0002 milliseconds per call
// seedrandom('explicit.')       - avg less than 0.2 milliseconds per call
// seedrandom('explicit.', true) - avg less than 0.2 milliseconds per call
// seedrandom() with crypto      - avg less than 0.2 milliseconds per call
// seedrandom() without crypto   - avg about 12 milliseconds per call
//
// On a 2012 windows 7 1.5ghz i5 laptop, Chrome, Firefox 19, IE 10, and
// Opera have similarly fast timings.  Slowest numbers are on Opera, with
// about 0.0005 milliseconds per seeded Math.random() and 15 milliseconds
// for autoseeding.
//
// LICENSE (BSD):
//
// Copyright 2013 David Bau, all rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//   1. Redistributions of source code must retain the above copyright
//      notice, this list of conditions and the following disclaimer.
//
//   2. Redistributions in binary form must reproduce the above copyright
//      notice, this list of conditions and the following disclaimer in the
//      documentation and/or other materials provided with the distribution.
//
//   3. Neither the name of this module nor the names of its contributors may
//      be used to endorse or promote products derived from this software
//      without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
/**
 * All code is in an anonymous closure to keep the global namespace clean.
 */
(function (
    global, pool, math, width, chunks, digits) {

//
// The following constants are related to IEEE 754 limits.
//
var startdenom = math.pow(width, chunks),
    significance = math.pow(2, digits),
    overflow = significance * 2,
    mask = width - 1;

//
// seedrandom()
// This is the seedrandom function described above.
//
math['seedrandom'] = function(seed, use_entropy) {
  var key = [];

  // Flatten the seed string or build one from local entropy if needed.
  var shortseed = mixkey(flatten(
    use_entropy ? [seed, tostring(pool)] :
    0 in arguments ? seed : autoseed(), 3), key);

  // Use the seed to initialize an ARC4 generator.
  var arc4 = new ARC4(key);

  // Mix the randomness into accumulated entropy.
  mixkey(tostring(arc4.S), pool);

  // Override Math.random

  // This function returns a random double in [0, 1) that contains
  // randomness in every bit of the mantissa of the IEEE 754 value.

  math['random'] = function() {         // Closure to return a random double:
    var n = arc4.g(chunks),             // Start with a numerator n < 2 ^ 48
        d = startdenom,                 //   and denominator d = 2 ^ 48.
        x = 0;                          //   and no 'extra last byte'.
    while (n < significance) {          // Fill up all significant digits by
      n = (n + x) * width;              //   shifting numerator and
      d *= width;                       //   denominator and generating a
      x = arc4.g(1);                    //   new least-significant-byte.
    }
    while (n >= overflow) {             // To avoid rounding up, before adding
      n /= 2;                           //   last byte, shift everything
      d /= 2;                           //   right using integer math until
      x >>>= 1;                         //   we have exactly the desired bits.
    }
    return (n + x) / d;                 // Form the number within [0, 1).
  };

  // Return the seed that was used
  return shortseed;
};

//
// ARC4
//
// An ARC4 implementation.  The constructor takes a key in the form of
// an array of at most (width) integers that should be 0 <= x < (width).
//
// The g(count) method returns a pseudorandom integer that concatenates
// the next (count) outputs from ARC4.  Its return value is a number x
// that is in the range 0 <= x < (width ^ count).
//
/** @constructor */
function ARC4(key) {
  var t, keylen = key.length,
      me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];

  // The empty key [] is treated as [0].
  if (!keylen) { key = [keylen++]; }

  // Set up S using the standard key scheduling algorithm.
  while (i < width) {
    s[i] = i++;
  }
  for (i = 0; i < width; i++) {
    s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))];
    s[j] = t;
  }

  // The "g" method returns the next (count) outputs as one number.
  (me.g = function(count) {
    // Using instance members instead of closure state nearly doubles speed.
    var t, r = 0,
        i = me.i, j = me.j, s = me.S;
    while (count--) {
      t = s[i = mask & (i + 1)];
      r = r * width + s[mask & ((s[i] = s[j = mask & (j + t)]) + (s[j] = t))];
    }
    me.i = i; me.j = j;
    return r;
    // For robust unpredictability discard an initial batch of values.
    // See http://www.rsa.com/rsalabs/node.asp?id=2009
  })(width);
}

//
// flatten()
// Converts an object tree to nested arrays of strings.
//
function flatten(obj, depth) {
  var result = [], typ = (typeof obj)[0], prop;
  if (depth && typ == 'o') {
    for (prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        try { result.push(flatten(obj[prop], depth - 1)); } catch (e) {}
      }
    }
  }
  return (result.length ? result : typ == 's' ? obj : obj + '\0');
}

//
// mixkey()
// Mixes a string seed into a key that is an array of integers, and
// returns a shortened string seed that is equivalent to the result key.
//
function mixkey(seed, key) {
  var stringseed = seed + '', smear, j = 0;
  while (j < stringseed.length) {
    key[mask & j] =
      mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++));
  }
  return tostring(key);
}

//
// autoseed()
// Returns an object for autoseeding, using window.crypto if available.
//
/** @param {Uint8Array=} seed */
function autoseed(seed) {
  try {
    global.crypto.getRandomValues(seed = new Uint8Array(width));
    return tostring(seed);
  } catch (e) {
    return [+new Date, global.document, global.history,
            global.navigator, global.screen, tostring(pool)];
  }
}

//
// tostring()
// Converts an array of charcodes to a string
//
function tostring(a) {
  return String.fromCharCode.apply(0, a);
}

//
// When seedrandom.js is loaded, we immediately mix a few bits
// from the built-in RNG into the entropy pool.  Because we do
// not want to intefere with determinstic PRNG state later,
// seedrandom will not call math.random on its own again after
// initialization.
//
mixkey(math.random(), pool);

// End anonymous scope, and pass initial values.
})(
  this,   // global window object
  [],     // pool: entropy pool starts empty
  Math,   // math: package containing random, pow, and seedrandom
  256,    // width: each RC4 output is 0 <= x < 256
  6,      // chunks: at least six RC4 outputs for each double
  52      // digits: there are 52 significant digits in a double
);





// PerlinSimplex 1.2
// Ported from Stefan Gustavson's java implementation by Sean McCullough banksean@gmail.com
// http://staffwww.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf
// Read Stefan's excellent paper for details on how this code works.
// octaves and falloff implementation (and passing jslint) by Ron Valstar
// also implemented Karsten Schmidt's implementation
if (!this.PerlinSimplex) {
    var PerlinSimplex = function() {

        var F2 = 0.5*(Math.sqrt(3)-1);
        var G2 = (3-Math.sqrt(3))/6;
        var G22 = 2*G2 - 1;
        var F3 = 1/3;
        var G3 = 1/6;
        var F4 = (Math.sqrt(5) - 1)/4;
        var G4 = (5 - Math.sqrt(5))/20;
        var G42 = G4*2;
        var G43 = G4*3;
        var G44 = G4*4 - 1;
        // Gradient vectors for 3D (pointing to mid points of all edges of a unit cube)
        var aGrad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
        // Gradient vectors for 4D (pointing to mid points of all edges of a unit 4D hypercube)
        var grad4 = [[0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],[0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],[1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],[-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],[1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],[-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],[1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],[-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0]];
        // To remove the need for index wrapping, double the permutation table length
        var aPerm;
        // A lookup table to traverse the simplex around a given point in 4D. 
        // Details can be found where this table is used, in the 4D noise method. 
        var simplex = [[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]];
        //
        var g;
        var n0, n1, n2, n3, n4;
        var s;
        var c;
        var sc;
        var i, j, k, l;
        var t;
        var x0, y0, z0, w0;
        var i1, j1, k1, l1;
        var i2, j2, k2, l2;
        var i3, j3, k3, l3;
        var x1, y1, z1, w1;
        var x2, y2, z2, w2;
        var x3, y3, z3, w3;
        var x4, y4, z4, w4;
        var ii, jj, kk, ll;
        var gi0, gi1, gi2, gi3, gi4;
        var t0, t1, t2, t3, t4;
        //
        //
        var oRng = Math;
        var iOctaves = 1;
        var fPersistence = 0.5;
        var fResult, fFreq, fPers;
        var aOctFreq; // frequency per octave
        var aOctPers; // persistence per octave
        var fPersMax; // 1 / max persistence
        //
        // octFreqPers
        var octFreqPers = function octFreqPers() {
            var fFreq, fPers;
            aOctFreq = [];
            aOctPers = [];
            fPersMax = 0;
            for (var i=0;i<iOctaves;i++) {
                fFreq = Math.pow(2,i);
                fPers = Math.pow(fPersistence,i);
                fPersMax += fPers;
                aOctFreq.push( fFreq );
                aOctPers.push( fPers );
            }
            fPersMax = 1 / fPersMax;
        };
        // 1D dotproduct
        var dot1 = function dot1(g, x) { 
            return g[0]*x;
        };
        // 2D dotproduct
        var dot2 = function dot2(g, x, y) {
            return g[0]*x + g[1]*y;
        };
        // 3D dotproduct
        var dot3 = function dot3(g, x, y, z) {
            return g[0]*x + g[1]*y + g[2]*z;
        };
        // 4D dotproduct
        var dot4 = function dot4(g, x, y, z, w) {
            return g[0]*x + g[1]*y + g[2]*z + g[3]*w;
        };
        // setPerm
        var setPerm = function setPerm() {
            var i;
            var p = [];
            for (i=0; i<256; i++) {
                p[i] = Math.floor(oRng.random()*256);
            }
            // To remove the need for index wrapping, double the permutation table length 
            aPerm = []; 
            for(i=0; i<512; i++) {
                aPerm[i] = p[i & 255];
            }
        };
        // noise2d
        var noise2d = function noise2d(x, y) {
            // Skew the input space to determine which simplex cell we're in 
            s = (x+y)*F2; // Hairy factor for 2D 
            i = Math.floor(x+s); 
            j = Math.floor(y+s); 
            t = (i+j)*G2; 
            x0 = x - (i - t); // Unskew the cell origin back to (x,y) space 
            y0 = y - (j - t); // The x,y distances from the cell origin 
            // For the 2D case, the simplex shape is an equilateral triangle. 
            // Determine which simplex we are in. 
            // Offsets for second (middle) corner of simplex in (i,j) coords 
            if (x0>y0) { // lower triangle, XY order: (0,0)->(1,0)->(1,1)
                i1 = 1;
                j1 = 0;
            }  else { // upper triangle, YX order: (0,0)->(0,1)->(1,1)
                i1 = 0;
                j1 = 1;
            }
            // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and 
            // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where 
            // c = (3-sqrt(3))/6 
            x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords 
            y1 = y0 - j1 + G2;
            x2 = x0 + G22; // Offsets for last corner in (x,y) unskewed coords 
            y2 = y0 + G22;
            // Work out the hashed gradient indices of the three simplex corners 
            ii = i&255;
            jj = j&255;
            // Calculate the contribution from the three corners 
            t0 = 0.5 - x0*x0-y0*y0;
            if (t0<0) {
                n0 = 0;
            } else {
                t0 *= t0;
                gi0 = aPerm[ii+aPerm[jj]] % 12;
                n0 = t0 * t0 * dot2(aGrad3[gi0], x0, y0);  // (x,y) of aGrad3 used for 2D gradient 
            }
            t1 = 0.5 - x1*x1-y1*y1;
            if (t1<0) {
                n1 = 0;
            } else {
                t1 *= t1;
                gi1 = aPerm[ii+i1+aPerm[jj+j1]] % 12;
                n1 = t1 * t1 * dot2(aGrad3[gi1], x1, y1);
            }
            t2 = 0.5 - x2*x2-y2*y2; 
            if (t2<0) {
                n2 = 0; 
            } else { 
                t2 *= t2; 
                gi2 = aPerm[ii+1+aPerm[jj+1]] % 12; 
                n2 = t2 * t2 * dot2(aGrad3[gi2], x2, y2); 
            } 
            // Add contributions from each corner to get the final noise value. 
            // The result is scaled to return values in the interval [0,1].
            return 70 * (n0 + n1 + n2);
        };
        // noise3d
        var noise3d = function noise3d(x,y,z) {
            // Noise contributions from the four corners 
            // Skew the input space to determine which simplex cell we're in 
            s = (x+y+z)*F3; // Very nice and simple skew factor for 3D 
            i = Math.floor(x+s); 
            j = Math.floor(y+s); 
            k = Math.floor(z+s); 
            t = (i+j+k)*G3;
            x0 = x - (i - t); // Unskew the cell origin back to (x,y,z) space 
            y0 = y - (j - t); // The x,y,z distances from the cell origin 
            z0 = z - (k - t); 
            // For the 3D case, the simplex shape is a slightly irregular tetrahedron. 
            // Determine which simplex we are in. 
            // Offsets for second corner of simplex in (i,j,k) coords 
            // Offsets for third corner of simplex in (i,j,k) coords 
            if (x0>=y0) { 
                if (y0>=z0) { // X Y Z order
                    i1 = 1;
                    j1 = 0;
                    k1 = 0;
                    i2 = 1;
                    j2 = 1;
                    k2 = 0;
                } else if (x0>=z0) { // X Z Y order
                    i1 = 1;
                    j1 = 0;
                    k1 = 0;
                    i2 = 1;
                    j2 = 0;
                    k2 = 1;
                } else { // Z X Y order
                    i1 = 0;
                    j1 = 0;
                    k1 = 1;
                    i2 = 1;
                    j2 = 0;
                    k2 = 1;
                } 
            } else { // x0<y0 
                if (y0<z0) { // Z Y X order
                    i1 = 0;
                    j1 = 0;
                    k1 = 1;
                    i2 = 0;
                    j2 = 1;
                    k2 = 1;
                } else if (x0<z0) { // Y Z X order
                    i1 = 0;
                    j1 = 1;
                    k1 = 0;
                    i2 = 0;
                    j2 = 1;
                    k2 = 1;
                } else { // Y X Z order
                    i1 = 0;
                    j1 = 1;
                    k1 = 0;
                    i2 = 1;
                    j2 = 1;
                    k2 = 0;
                }
            } 
            // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z), 
            // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and 
            // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where 
            // c = 1/6.
            x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords 
            y1 = y0 - j1 + G3; 
            z1 = z0 - k1 + G3; 
            x2 = x0 - i2 + F3; // Offsets for third corner in (x,y,z) coords 
            y2 = y0 - j2 + F3; 
            z2 = z0 - k2 + F3; 
            x3 = x0 - 0.5; // Offsets for last corner in (x,y,z) coords 
            y3 = y0 - 0.5; 
            z3 = z0 - 0.5; 
            // Work out the hashed gradient indices of the four simplex corners 
            ii = i&255; 
            jj = j&255; 
            kk = k&255; 
            // Calculate the contribution from the four corners 
            t0 = 0.6 - x0*x0 - y0*y0 - z0*z0; 
            if (t0<0) {
                n0 = 0; 
            } else { 
                t0 *= t0; 
                gi0 = aPerm[ii+aPerm[jj+aPerm[kk]]] % 12; 
                n0 = t0 * t0 * dot3(aGrad3[gi0], x0, y0, z0); 
            }
            t1 = 0.6 - x1*x1 - y1*y1 - z1*z1; 
            if (t1<0) {
                n1 = 0; 
            } else { 
                t1 *= t1; 
                gi1 = aPerm[ii+i1+aPerm[jj+j1+aPerm[kk+k1]]] % 12; 
                n1 = t1 * t1 * dot3(aGrad3[gi1], x1, y1, z1); 
            } 
            t2 = 0.6 - x2*x2 - y2*y2 - z2*z2; 
            if (t2<0) {
                n2 = 0; 
            } else { 
                t2 *= t2; 
                gi2 = aPerm[ii+i2+aPerm[jj+j2+aPerm[kk+k2]]] % 12; 
                n2 = t2 * t2 * dot3(aGrad3[gi2], x2, y2, z2); 
            } 
            t3 = 0.6 - x3*x3 - y3*y3 - z3*z3; 
            if (t3<0) {
                n3 = 0; 
            } else { 
                t3 *= t3; 
                gi3 = aPerm[ii+1+aPerm[jj+1+aPerm[kk+1]]] % 12; 
                n3 = t3 * t3 * dot3(aGrad3[gi3], x3, y3, z3); 
            } 
            // Add contributions from each corner to get the final noise value. 
            // The result is scaled to stay just inside [0,1] 
            return 32 * (n0 + n1 + n2 + n3);
        };
        // noise4d
        var noise4d = function noise4d(x,y,z,w) {
            // from the five corners
            // Skew the (x,y,z,w) space to determine which cell of 24 simplices
            s = (x + y + z + w) * F4; // Factor for 4D skewing
            i = Math.floor(x + s);
            j = Math.floor(y + s);
            k = Math.floor(z + s);
            l = Math.floor(w + s);
            t = (i + j + k + l) * G4; // Factor for 4D unskewing
            x0 = x - (i - t); // The x,y,z,w distances from the cell origin
            y0 = y - (j - t);
            z0 = z - (k - t);
            w0 = w - (l - t);
            // For the 4D case, the simplex is a 4D shape I won't even try to describe.
            // To find out which of the 24 possible simplices we're in, we need to determine the magnitude ordering of x0, y0, z0 and w0.
            // The method below is a good way of finding the ordering of x,y,z,w and then find the correct traversal order for the simplex were in.
            // First, six pair-wise comparisons are performed between each possible pair of the four coordinates, and the results are used to add up binary bits for an integer index.
            c = 0;
            if (x0>y0) {
                c = 0x20;
            }
            if (x0>z0) {
                c |= 0x10;
            }
            if (y0>z0) {
                c |= 0x08;
            }
            if (x0>w0) {
                c |= 0x04;
            }
            if (y0>w0) {
                c |= 0x02;
            }
            if (z0>w0) {
                c |= 0x01;
            }
            // simplex[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some
            // order. Many values of c will never occur, since e.g. x>y>z>w makes
            // x<z, y<w and x<w impossible. Only the 24 indices which have non-zero
            // entries make any sense. We use a thresholding to set the coordinates
            // in turn from the largest magnitude. The number 3 in the "simplex"
            // array is at the position of the largest coordinate.
            sc = simplex[c];
            i1 = sc[0] >= 3 ? 1 : 0;
            j1 = sc[1] >= 3 ? 1 : 0;
            k1 = sc[2] >= 3 ? 1 : 0;
            l1 = sc[3] >= 3 ? 1 : 0;
            // The number 2 in the "simplex" array is at the second largest
            // coordinate.
            i2 = sc[0] >= 2 ? 1 : 0;
            j2 = sc[1] >= 2 ? 1 : 0;
            k2 = sc[2] >= 2 ? 1 : 0;
            l2 = sc[3] >= 2 ? 1 : 0;
            // The number 1 in the "simplex" array is at the second smallest
            // coordinate.
            i3 = sc[0] >= 1 ? 1 : 0;
            j3 = sc[1] >= 1 ? 1 : 0;
            k3 = sc[2] >= 1 ? 1 : 0;
            l3 = sc[3] >= 1 ? 1 : 0;
            // The fifth corner has all coordinate offsets = 1, so no need to look
            // that up.
            x1 = x0 - i1 + G4; // Offsets for second corner in (x,y,z,w)
            y1 = y0 - j1 + G4;
            z1 = z0 - k1 + G4;
            w1 = w0 - l1 + G4;

            x2 = x0 - i2 + G42; // Offsets for third corner in (x,y,z,w)
            y2 = y0 - j2 + G42;
            z2 = z0 - k2 + G42;
            w2 = w0 - l2 + G42;

            x3 = x0 - i3 + G43; // Offsets for fourth corner in (x,y,z,w)
            y3 = y0 - j3 + G43;
            z3 = z0 - k3 + G43;
            w3 = w0 - l3 + G43;

            x4 = x0 + G44; // Offsets for last corner in (x,y,z,w)
            y4 = y0 + G44;
            z4 = z0 + G44;
            w4 = w0 + G44;

            // Work out the hashed gradient indices of the five simplex corners
            ii = i&255;
            jj = j&255;
            kk = k&255;
            ll = l&255;

            // Calculate the contribution from the five corners
            t0 = 0.6 - x0*x0 - y0*y0 - z0*z0 - w0*w0;
            if (t0<0) {
                n0 = 0; 
            } else { 
                t0 *= t0;
                gi0 = aPerm[ii + aPerm[jj + aPerm[kk + aPerm[ll]]]]%32;
                n0 = t0*t0*dot4(grad4[gi0], x0, y0, z0, w0);
            }
            t1 = 0.6 - x1*x1 - y1*y1 - z1*z1 - w1*w1;
            if (t1<0) {
                n1 = 0; 
            } else { 
                t1 *= t1;
                gi1 = aPerm[ii + i1 + aPerm[jj + j1 + aPerm[kk + k1 + aPerm[ll + l1]]]]%32;
                n1 = t1*t1*dot4(grad4[gi1], x1, y1, z1, w1);
            }
            t2 = 0.6 - x2*x2 - y2*y2 - z2*z2 - w2*w2;
            if (t2<0) {
                n2 = 0; 
            } else { 
                t2 *= t2;
                gi2 = aPerm[ii + i2 + aPerm[jj + j2 + aPerm[kk + k2 + aPerm[ll + l2]]]]%32;
                n2 = t2*t2*dot4(grad4[gi2], x2, y2, z2, w2);
            }
            t3 = 0.6 - x3*x3 - y3*y3 - z3*z3 - w3*w3;
            if (t3<0) {
                n3 = 0; 
            } else { 
                t3 *= t3;
                gi3 = aPerm[ii + i3 + aPerm[jj + j3 + aPerm[kk + k3 + aPerm[ll + l3]]]]%32;
                n3 = t3*t3*dot4(grad4[gi3], x3, y3, z3, w3);
            }
            t4 = 0.6 - x4*x4 - y4*y4 - z4*z4 - w4*w4;
            if (t4<0) {
                n4 = 0; 
            } else { 
                t4 *= t4;
                gi4 = aPerm[ii + 1 + aPerm[jj + 1 + aPerm[kk + 1 + aPerm[ll + 1]]]]%32;
                n4 = t4*t4*dot4(grad4[gi4], x4, y4, z4, w4);
            }
            // Sum up and scale the result to cover the range [-1,1]
            return 27.0*(n0 + n1 + n2 + n3 + n4);
        };
        // init
        setPerm();
        // return
        return {
            noise: function(x,y,z,w) {
                fResult = 0;
                for (g=0;g<iOctaves;g++) {
                    fFreq = aOctFreq[g];
                    fPers = aOctPers[g];
                    switch (arguments.length) {
                        case 4:  fResult += fPers*noise4d(fFreq*x,fFreq*y,fFreq*z,fFreq*w); break;
                        case 3:  fResult += fPers*noise3d(fFreq*x,fFreq*y,fFreq*z); break;
                        default: fResult += fPers*noise2d(fFreq*x,fFreq*y);
                    }
                }
                return ( fResult*fPersMax + 1 )*0.5;
            },noiseDetail: function(octaves,falloff) {
                iOctaves = octaves||iOctaves;
                fPersistence = falloff||fPersistence;
                octFreqPers();
            },setRng: function(r) {
                oRng = r;
                setPerm();
            },toString: function() {
                return "[object PerlinSimplex "+iOctaves+" "+fPersistence+"]";
            }
        };
    }();
}

// precalcs
if(!this.sqrt2) this.sqrt2 = Math.sqrt(2);
if(!this.HALF_GRID_SIZE) this.HALF_GRID_SIZE = GRID_SIZE * 0.5;
if(!this.HALF_CANVAS_WIDTH) this.HALF_CANVAS_WIDTH = canvas.width * 0.5;
if(!this.HALF_CANVAS_HEIGHT) this.HALF_CANVAS_HEIGHT = canvas.height * 0.5;

function getAngle(pointA, pointB) {
    var angle = Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
    if (angle < 0) {
        angle += (Math.PI * 2);
    }
    return angle;
}

function pointDistance(pointA, pointB) {
    var diffX = pointB.x - pointA.x;
    var diffY = pointB.y - pointA.y;
    var dist = Math.sqrt(diffX * diffX + diffY * diffY);
    return dist;
}

function worldToTile(x, y) {
    var tileLoc = new Point(
        Math.floor(x / GRID_SIZE),
        Math.floor(y / GRID_SIZE)
    );
    return tileLoc;
}

function tileToWorld(x, y) {
    var worldLoc = new Point(
        x * GRID_SIZE,
        y * GRID_SIZE
    );
    return worldLoc;
}

function screenToTile(x, y) {
     var tileLoc = new Point(
        Math.floor((x + gameCamera.x - HALF_CANVAS_WIDTH) / GRID_SIZE),
        Math.floor((y + gameCamera.y - HALF_CANVAS_HEIGHT) / GRID_SIZE)
    );
    return tileLoc;
}

function tileToScreen(x, y) {
    var screenLoc = new Point(
        x * GRID_SIZE - gameCamera.x + HALF_CANVAS_WIDTH,
        y * GRID_SIZE - gameCamera.y + HALF_CANVAS_HEIGHT
    );
    return screenLoc;
}

function worldToScreen(x, y) {
    var screenLoc = new Point(
        x - gameCamera.x + HALF_CANVAS_WIDTH,
        y - gameCamera.y + HALF_CANVAS_HEIGHT
    );
    return screenLoc;
}

function screenToWorld(x, y) {
    var worldLoc = new Point(
        x + gameCamera.x - HALF_CANVAS_WIDTH,
        y + gameCamera.y - HALF_CANVAS_HEIGHT
    );
    return worldLoc;
}

function movePoint(point, angle, distance) {
    var result = new Point(
        point.x - Math.cos(angle) * distance,
        point.y - Math.sin(angle) * distance
    );
    return result;
}

function easeOut(progress) {
  var angle = progress * Math.PI * 0.5;
  var result = Math.sin(angle);
  return result;
}

function easeIn(progress) {
  var halfPi = Math.PI * 0.5
  var angle = progress * halfPi;
  var result = Math.sin(angle - halfPi) + 1;
  return result;
}

function easeInOut(progress) {
  var angle = progress * Math.PI;
  var result = (Math.sin(angle - Math.PI * 0.5) + 1) * 0.5;
  return result;
}

var Pathfinder = Class.extend({
    startPoint: null,
    endPoint: null,
    diagonal: true,
    goalCallback:null,
    updateCallback:null,
    closedSet: null,
    openSet: null,
    cameFrom: null,
    gScore: null,
    fScore: null,
    ITERATION_THRESHOLD: null,

    //TODO: Work on the update callback

    init:function(_startPoint, _endPoint, _diagonal, _goalCallback, _updateCallback) {
        ITERATION_THRESHOLD = 8;
        startPoint = _startPoint;
        endPoint = _endPoint;
        diagonal = _diagonal;
        goalCallback = _goalCallback;
        updateCallback = _updateCallback;
        openSet = [startPoint];
        closedSet = [];
        cameFrom = {};
        gScore = {};
        fScore = {};
        this.isActive = true;

        gScore[startPoint.x + "," + startPoint.y] = 0;
        fScore[startPoint.x + "," + startPoint.y] = this.heuristicCostEstimate(startPoint, endPoint, diagonal);
    },
    update:function() {
        var numIterations = 0;
        while(this.isActive && openSet.length) {
            var currentPoint = openSet[0];
            
            if(currentPoint.x == endPoint.x && currentPoint.y == endPoint.y) {
                goalCallback(this.reconstructPath(cameFrom, currentPoint));
                this.stop();
                return;
            }

            var newOpenSet = [];
            for(var o=0, oLen=openSet.length; o<oLen; o++) {
                if(openSet[o].x != currentPoint.x ||
                    openSet[o].y != currentPoint.y
                )
                    newOpenSet.push(openSet[o]);
            }
            openSet = newOpenSet;
            closedSet.push(currentPoint);

            // --------- debug ARTS -----------
              var cameFromTile = cameFrom[currentPoint.x + "," + currentPoint.y];
              var currentSceenPoint = tileToScreen(currentPoint.x, currentPoint.y);
              if(cameFromTile) {
                bgContext.beginPath();
                bgContext.lineWidth = 2;
                bgContext.strokeStyle = "rgba(0, 100, 255, .5)";
                var cameFromScreenPoint = tileToScreen(cameFromTile.x, cameFromTile.y);
                // stupid hack. No idea why this is happening, but let's find out.
                bgContext.moveTo(cameFromScreenPoint.x + HALF_GRID_SIZE, cameFromScreenPoint.y + HALF_GRID_SIZE);
                bgContext.lineTo(currentSceenPoint.x + HALF_GRID_SIZE, currentSceenPoint.y + HALF_GRID_SIZE);
                bgContext.lineTo(cameFromScreenPoint.x + HALF_GRID_SIZE, cameFromScreenPoint.y + HALF_GRID_SIZE);
                // -----------------
                bgContext.stroke();
                bgContext.closePath();
              }

              bgContext.beginPath();
              bgContext.fillStyle = "rgba(0, 100, 255, .5)";
              bgContext.arc(currentSceenPoint.x + HALF_GRID_SIZE, currentSceenPoint.y + HALF_GRID_SIZE, 3, 0, Math.PI*2);
              bgContext.fill();
              bgContext.closePath();
            // -------- end debug -------

            var neighbors = this.getNeighbors(currentPoint, cameFrom[currentPoint.x + "," + currentPoint.y], diagonal);
            for(var i=0, len=neighbors.length; i<len; i++) {
                var neighborDist = neighbors[i].dist;
                var neighborPoint = new Point(neighbors[i].x, neighbors[i].y);

                if(!gameWorld.isAllowed(currentPoint, neighborPoint)) {
                    closedSet.push(neighborPoint);
                    // --------- debug ARTS -----------
                    if(!isShipTile(gameWorld.getTile(neighborPoint.x, neighborPoint.y))) {
                        //var notAllowedCameFromTile = cameFrom[neighborPoint.x + "," + neighborPoint.y];
                        var notAllowedSceenPoint = tileToScreen(neighborPoint.x, neighborPoint.y);
                        //if(notAllowedCameFromTile) {
                          bgContext.beginPath();
                          bgContext.lineWidth = 2;
                          bgContext.strokeStyle = "rgba(180, 0, 0, 1)";
                          var notAllowedCameFromScreenPoint = tileToScreen(currentPoint.x, currentPoint.y);
                          //stupid hack
                          bgContext.moveTo(notAllowedCameFromScreenPoint.x + HALF_GRID_SIZE, notAllowedCameFromScreenPoint.y + HALF_GRID_SIZE);
                          bgContext.lineTo(notAllowedSceenPoint.x + HALF_GRID_SIZE, notAllowedSceenPoint.y + HALF_GRID_SIZE);
                          bgContext.lineTo(notAllowedCameFromScreenPoint.x + HALF_GRID_SIZE, notAllowedCameFromScreenPoint.y + HALF_GRID_SIZE);
                          // --------
                          bgContext.stroke();
                          bgContext.closePath();
                        //}


                        bgContext.beginPath();
                        bgContext.fillStyle = "rgba(180, 0, 0, 1)";
                        bgContext.arc(notAllowedSceenPoint.x + HALF_GRID_SIZE, notAllowedSceenPoint.y + HALF_GRID_SIZE, 3, 0, Math.PI*2);
                        bgContext.fill();
                        bgContext.closePath();
                      // -------- end debug -------
                    }
                    continue;
                }

                var tentativeGScore = gScore[currentPoint.x + "," + currentPoint.y] + neighborDist;

                var foundNeighbor = false;
                for(var c=0, cLen=closedSet.length; c<cLen; c++) {
                    if(closedSet[c].x == neighborPoint.x &&
                        closedSet[c].y == neighborPoint.y) {
                        foundNeighbor = true;
                        break;
                    }
                }
                
                if(foundNeighbor && tentativeGScore >= gScore[neighborPoint.x + "," + neighborPoint.y])
                    continue;

                foundNeighbor = false;
                for(o=0, oLen=openSet.length; o<oLen; o++) {
                    if(openSet[o].x == neighborPoint.x &&
                        openSet[o].y == neighborPoint.y) {
                        openSet.splice(o, 1);
                        break;
                    }
                }

                if(!foundNeighbor || tentativeGScore < gScore[neighborPoint.x + "," + neighborPoint.y]) {
                    cameFrom[neighborPoint.x + "," + neighborPoint.y] = currentPoint;
                    gScore[neighborPoint.x + "," + neighborPoint.y] = tentativeGScore;
                    fScore[neighborPoint.x + "," + neighborPoint.y] = tentativeGScore + this.heuristicCostEstimate(neighborPoint, endPoint, diagonal);
                    if(!foundNeighbor)
                        openSet.push(neighborPoint);
                }
            }
            openSet.sort(this.sortOpen);

            if(numIterations > ITERATION_THRESHOLD)
                return;

            numIterations++;
        }
        this.stop();
        return;
    },
    sortOpen:function(a, b) {
        var result = 0;
        if(fScore[a.x + "," + a.y] < fScore[b.x + "," + b.y]) result = -1;
        else if(fScore[a.x + "," + a.y] > fScore[b.x + "," + b.y]) result = 1;
        return result;
    },
    heuristicCostEstimate:function(point, goal, diagonal) {
        var dx = Math.abs(point.x - goal.x);
        var dy = Math.abs(point.y - goal.y);
        var result;

        if(diagonal) {
            if(dx > dy)
                result = sqrt2 * dy + (dx - dy);
            else
                result = sqrt2 * dx + (dy - dx);
        }
        else 
            result = dx + dy;

        return result;
    },
    //get neighbors while auto-pruning the path with a Jump Point Search. 
    //Source: http://aigamedev.com/open/tutorial/symmetry-in-pathfinding/
    getNeighbors:function(point, prevPoint, diagonal) {
        var neighbors;
        if(!prevPoint || !diagonal) {
            neighbors = [
                    {"x": point.x, "y": point.y - 1, "dist": 1},
                    {"x": point.x + 1, "y": point.y, "dist": 1},
                    {"x": point.x - 1, "y": point.y, "dist": 1},
                    {"x": point.x, "y": point.y + 1, "dist": 1}
                ];
            if(diagonal) {
                //avoid moving through narrow diagonal cracks 
                var upOpen = gameWorld.isAllowed(prevPoint, new Point(point.x, point.y - 1));
                var rightOpen = gameWorld.isAllowed(prevPoint, new Point(point.x + 1, point.y));
                var downOpen = gameWorld.isAllowed(prevPoint, new Point(point.x, point.y + 1));
                var leftOpen = gameWorld.isAllowed(prevPoint, new Point(point.x - 1, point.y));
                
                if(upOpen || rightOpen)
                    neighbors.push({"x": point.x + 1, "y": point.y - 1, "dist": sqrt2});
                if(rightOpen || downOpen)
                    neighbors.push({"x": point.x + 1, "y": point.y + 1, "dist": sqrt2});
                if(downOpen || leftOpen)
                    neighbors.push({"x": point.x - 1, "y": point.y + 1, "dist": sqrt2});
                if(leftOpen || upOpen)
                    neighbors.push({"x": point.x - 1, "y": point.y - 1, "dist": sqrt2});
            }
        } else {
            var opposite = new Point(point.x - (prevPoint.x - point.x), point.y - (prevPoint.y - point.y));
            if(prevPoint.x == point.x) {
                neighbors = [{"x": point.x, "y": opposite.y, "dist": 1}];
                //if the opposite diagonal spaces are blocked to the prev tile, add them to the current one
                if(gameWorld.isAllowed(prevPoint, new Point(point.x, opposite.y))) {
                    if(!gameWorld.isAllowed(prevPoint, new Point(point.x - 1, point.y))) neighbors.push({"x": point.x - 1, "y": opposite.y, "dist": sqrt2});
                    if(!gameWorld.isAllowed(prevPoint, new Point(point.x + 1, point.y))) neighbors.push({"x": point.x + 1, "y": opposite.y, "dist": sqrt2});
                }
            } else if(prevPoint.y == point.y){
                neighbors = [{"x": opposite.x, "y": point.y, "dist": 1}];
                //if the opposite diagonal spaces are blocked to the prev tile, add them to the current one
                if(gameWorld.isAllowed(prevPoint, new Point(opposite.x, point.y))) {
                    if(!gameWorld.isAllowed(prevPoint, new Point(point.x, point.y - 1))) neighbors.push({"x": opposite.x, "y": point.y - 1, "dist": sqrt2});
                    if(!gameWorld.isAllowed(prevPoint, new Point(point.x, point.y + 1))) neighbors.push({"x": opposite.x, "y": point.y + 1, "dist": sqrt2});
                }
            } else {
                neighbors = [
                    {"x": point.x, "y": opposite.y, "dist": 1},
                    {"x": opposite.x, "y": point.y, "dist": 1}
                ];
                //don't allow squeezing through corners
                if(gameWorld.isAllowed(prevPoint, new Point(point.x, opposite.y)) || gameWorld.isAllowed(prevPoint, new Point(opposite.x, point.y)))
                    neighbors.push({"x": opposite.x, "y": opposite.y, "dist": sqrt2});
                //hug those curves
                if(!gameWorld.isAllowed(prevPoint, new Point(prevPoint.x, point.y)) && gameWorld.isAllowed(prevPoint, new Point(point.x, opposite.y))) neighbors.push({"x": prevPoint.x, "y": opposite.y, "dist": 1});
                if(!gameWorld.isAllowed(prevPoint, new Point(point.x, prevPoint.y)) && gameWorld.isAllowed(prevPoint, new Point(opposite.x, point.y))) neighbors.push({"x": opposite.x, "y": prevPoint.y, "dist": 1});
            }
        }

        return neighbors;
    },
    reconstructPath:function(cameFrom, currentPoint) {
        var lastPoint = cameFrom[currentPoint.x + "," + currentPoint.y];
        if(lastPoint) {
            var p = this.reconstructPath(cameFrom, lastPoint);
            p.push(currentPoint);
            return p;
        } else {
            return [currentPoint];
        }
    },
    stop:function() {
        this.isActive = false;
    }
});