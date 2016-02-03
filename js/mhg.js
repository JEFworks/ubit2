/**
 * Minimum-hypergeometric test for enrichment in ranked binary lists.
 * Copyright (C) 2015  Kamil Slowikowski <kslowikowski@fas.harvard.edu>
 *               2015  Florian Wagner <florian.wagner@duke.edu>
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var MHG = function(){
    this.mhg_test = mhg_test;

    function is_equal(a, b, tol) {
        if (a == b) {
            return true;
        } else if (Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)) < tol) {
            return true;
        }
        return false;
    }

    /**
     * Starting with the tail probability of finding some particular number of
     * successes less than k, update it to the tail probability of finding k
     * or more successes.
     * 
     * This is function is only useful in the context of this package, where
     * we have split the probability computation across several functions.
     * 
     * @param {Number} p Probability of exactly k successes.
     * @param {Number} k Number of successes after n draws.
     * @param {Number} N Size of the population.
     * @param {Number} K Number of successes in the population.
     * @param {Number} n Number of draws, without replacement.
     * @return {Number} Number between 0 and 1.
     */
    function get_hypergeometric_pvalue(p, k, N, K, n) {
        var pval = p;
        for (var i = k; i < Math.min(K, n); i++) {
            p = p * ( (n - i) * (K - i) ) /
                ( (i + 1) * (N - K - n + i + 1) );
            pval = pval + p;
        }
        if (pval < 0) {
            console.log("Float overflow", pval);
            pval = 0;
        }
        return pval;
    }

    /**
     * Compute the minimum hypergeometric score (mHG).
     *
     * The mHG is the hypergeometric probability computed using the first
     * n elements of a binary vector. The optimal choice of n is discovered by
     * starting at n = 1 and iteratively increasing the size until we minimize
     * the mHG.
     * 
     * @param {Number[]} x Binary vector ordered by some statistic.
     * @param {Number} N Size of the population.
     * @param {Number} K Number of successes in the population.
     * @param {Number} L Only consider the first L elements of the vector.
     * @param {Number} X Require at least X successes for a score less than 1.
     * @param {Object} scores A vector of mHG scores.
     * @return {Number} An integer between 0 and L.
     */
    function get_mHG(x, N, K, L, X, scores, tol) {
        var p = 1.0;
        var pval;
        var mHG = 1.1;
        var k = 0;
        var threshold = 0;
        
        if (K === 0 || K === N || K < X) {
            scores.value[0] = 1.0;
            return threshold;
        }
        
        for (var n = 0; n < L; n++) {
            // We see a zero in the presence vector.
            if (x[n] === 0) {
                // Compute P(k | N,K,n+1) from P(k | N,K,n)
                p = p * ( (n + 1) * (N - K - n + k) ) /
                    ( (N - n) * (n - k + 1) );
            }
            // We see a one in the presence vector.
            else {
                // Compute P(k+1 | N,K,n+1) from P(k | N,K,n)
                p = p * ( (n + 1) * (K - k) ) / ( (N - n) * (k + 1) );
                k = k + 1;
            }
            
            // Get the probability for k or more successes after n + 1 trials.
            pval = get_hypergeometric_pvalue(p, k, N, K, n + 1);
            scores.value[n] = pval;
            
            // Update the best score and threshold we have seen.
            if (x[n] !== 0 && k >= X) {
                if (pval < mHG && !is_equal(pval, mHG, tol)) {
                    mHG = pval;
                    threshold = n;
                }
            }
        }
        
        // We did not see enough ones in the first L elements of x.
        if (threshold === 0) {
            scores.value[0] = 1.0;
        }
        
        return threshold;
    }

    /**
     * Create a matrix filled with zeros.
     *
     * @param {Number} nrow The number of rows in the matrix.
     * @param {Number} ncol The number of columns in the matrix.
     * @return {Number[][]} A matrix (an array of rows).
     */
    function zeros(nrow, ncol) {
        var array = [];
        for (var i = 0; i < nrow; i++) {
            array[i] = [];
            for (var j = 0; j < nrow; j++) {
                array[i][j] = 0.0;
            }
        }
        return array;
    }

    /**
     * Compute a minimum hypergeometric (mHG) p-value by dynamic programming.
     * 
     * @param {Number} N Size of the population.
     * @param {Number} K Number of successes in the population.
     * @param {Number} L Only consider scores for the first L observations.
     * @param {Number} X Require at least X ones to get a score less than 1.
     * @param {Number} mHG Find how many mHG scores are lower than this.
     * @return {Number} A p-value between 0 and 1.
     */
    function get_mHG_pvalue(N, K, L, X, mHG, tol) {
        if (mHG > 1.0 || is_equal(mHG, 1.0, tol)) {
            return 1.0;
        } else if (mHG === 0) {
            return 0;
        } else if (K === 0 || K >= N || K < X) {
            return 0;
        } else if (L > N) {
            return 0;
        }
        
        // Number of failures in the population.
        var W = N - K;
        // Number of: trials, successes, failures.
        var n, k, w;
        
        var p_start = 1.0;
        var p;
        var pval;
        
        var matrix = zeros(K + 1, W + 1);
        matrix[0][0] = 1;
        
        for (n = 1; n < N; n++) {
            // Sucesses in the population is at least number of trials.
            if (K >= n) {
                k = n;
                p_start = p_start * (K - n + 1) / (N - n + 1);
            } else {
                k = K;
                p_start = p_start * n / (n - K);
            }
            
            // We lack enough floating point precision to compute the p-value.
            if (p_start <= 0) {
                console.log("Float overflow", p_start);
                return Number.MIN_VALUE;
            }
            
            p = p_start;
            pval = p_start;
            // Number of failures.
            w = n - k;
            
            // This trial is within the first L elements, and is at least X.
            if (n <= L && n >= X) {
                while (k >= X && w < W &&
                        (is_equal(pval, mHG, tol) || pval < mHG)) {
                    matrix[k][w] = 0;
                    p = p * ( k * (N - K - n + k) ) /
                        ( (n - k + 1) * (K - k + 1) );
                    pval = pval + p;
                    w = w + 1;
                    k = k - 1;
                }
            }
            
            while (k >= 0 && w <= W) {
                if (w > 0 && k > 0) {

                    matrix[k][w] =
                        matrix[k][w - 1] * (W - w + 1) / (N - n + 1) +
                        matrix[k - 1][w] * (K - k + 1) / (N - n + 1);

                } else if (w > 0) {

                    matrix[k][w] = 
                        matrix[k][w - 1] * (W - w + 1) / (N - n + 1);

                } else if (k > 0) {

                    matrix[k][w] =
                        matrix[k - 1][w] * (K - k + 1) / (N - n + 1);

                }
                w = w + 1;
                k = k - 1;
            }
        }

        return {
            pvalue: 1.0 - (matrix[K][W - 1] + matrix[K - 1][W]),
            matrix: matrix
        };
    }

    /**
     * @summary Test for enrichment in a ranked binary list.
     * 
     * Given a ranked binary list of ones and zeros, test if the ones are
     * enriched at the beginning of the list.
     *
     * Suppose we have a set of \code{N = 5000} genes and \code{K = 100} of them
     * are annotated with a Gene Ontology (GO) term. Further, suppose that we find
     * some subset of these genes to be significantly differentially expressed
     * (DE) between two conditions. Within the DE genes, we notice that
     * \code{k = 15} of the DE genes are annotated with the Gene Ontology term. At
     * this point, we would like to know if the GO term is enriched for DE genes.
     *
     * 
     * We use the hypergeometric distribution to compute a probability that we
     * would observe a given number of DE genes annotated with a GO term. You
     * can find more details in the documentation for \code{\link{dhyper}}.
     * 
     * The method consists of three steps:
     * 
     * 1. Compute a hypergeometric probability at each rank in the list.
     * 2. Choose the minimum hypergeometric probability (mHG) as the test
     *    statistic.
     * 3. Use dynamic programming to compute the exact permutation p-value
     *    for observing a test statistic at least as extreme by chance.
     * 
     * Eden, E., Lipson, D., Yogev, S. & Yakhini, Z. Discovering motifs in
     * ranked lists of DNA sequences. PLoS Comput. Biol. 3, e39 (2007).
     * @see {@link http://dx.doi.org/10.1371/journal.pcbi.0030039|Eden2007}
     *
     * Wagner, F. GO-PCA: An Unsupervised Method to Explore Biological
     * Heterogeneity Based on Gene Expression and Prior Knowledge. bioRxiv
     * (2015).
     * @see {@link http://dx.doi.org/10.1101/018705|Wagner2015}
     *
     * @param {Number[]} x Binary vector of ones and zeros.
     * @param {Number} N Size of the population.
     * @param {Number} K Number of successes in the population.
     * @param {Number} L Only consider scores for the first L observations.
     * @param {Number} X Require at least X ones to get a score less than 1.
     * @param {Boolean} upper_bound Instead of running a dynamic programming
     *   algorithm, return the upper bound for the p-value.
     *
     * @return {Object} An object with keys "threshold", "mHG", and "pvalue".
     *
     * @example
     * // Size of the population.
     * var N = 5000;
     * // Successes in the population.
     * var K = 100;
     * // Only consider enrichments in the first L observations.
     * var L = N / 4;
     * // Require at least X successes in the first L observations.
     * var X = 5;
     *
     * # Binary vector of successes and failures.
     * var v = d3.range(N).map(function(){ return 0; });
     * v[27] = 1;
     * v[29] = 1;
     * v[50] = 1;
     * v[62] = 1;
     * v[81] = 1;
     * v[89] = 1;
     * v[90] = 1;
     * v[92] = 1;
     * v[93] = 1;
     * v[104] = 1;
     * v[130] = 1;
     * v[139] = 1;
     * v[140] = 1;
     * v[147] = 1;
     * v[181] = 1;
     *
     * res = mhg_test(v, N, K, L, X);
     *
     * // 1.81e-5
     * res.pvalue;
     */
    function mhg_test(x, N, K, L, X, upper_bound, tol) {
        console.assert(N >= 0, "Condition not met: N >= 0");
        console.assert(0 <= K && K <= N, "Condition not met: 0 <= K <= N");
        console.assert(0 <= L && L <= N, "Condition not met: 0 <= L <= N");
        console.assert(0 <= X && X <= K, "Condition not met: 0 <= X <= K");

        if (typeof(upper_bound) === 'undefined') upper_bound = false;
        if (typeof(tol) === 'undefined') tol = 1e-16;

        var retval = {
            'threshold': 0,
            'mhg': 1.0,
            'pvalue': 1.0
        };

        if (K === 0 || K === N) {
            return retval;
        }
        
        var threshold;
        var mHG, mHG_pvalue;
        
        // Get XL-mHG scores and the threshold for the best score.
        var scores = {value:d3.range(L).map(function(){ return 0; })};

        threshold = get_mHG(x, N, K, L, X, scores, tol);
        mHG = scores.value[threshold];
        
        // There is no enrichment at all.
        if (is_equal(mHG, 1.0, tol)) {
            return retval;
        }
        
        matrix = null;

        // Don't compute XL-mHG p-value, instead use upper bound.
        if (upper_bound) {
            mHG_pvalue = Math.min(1.0, mHG * K);
        }
        // Compute an XL-mHG p-value.
        else {
            retval = get_mHG_pvalue(N, K, L, X, mHG, tol);
            mHG_pvalue = retval.pvalue;
            matrix = retval.matrix;
            
            // Floating point accuracy was insufficient for the p-value.
            if (mHG_pvalue <= 0) {
                // Use the upper bound instead.
                mHG_pvalue = mHG * K;
            }
        }

        return {
            'threshold': threshold,
            'mhg': scores.value.map(function(x) { return -Math.log10(x); }),
            'pvalue': mHG_pvalue,
            'matrix': matrix
        };
    }
};
